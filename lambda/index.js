const AWS = require('aws-sdk');
var winston = require('winston');
var saml2 = require('saml2-js');
var axios = require('axios').default;

var LOG = winston.createLogger({
    level: process.env.LOG_LEVEL.toLowerCase(),
    transports: [
        new winston.transports.Console()
    ]
});

var ssm = new AWS.SSM();
var sts = new AWS.STS();
var cloud9 = new AWS.Cloud9();

async function decodeSAMLResponse(sp, idp, samlresponse) {
    let resp = await new Promise((resolve,reject) => {
        sp.post_assert(idp, {
            request_body: {
                'SAMLResponse': samlresponse
            }
        }, function(err, resp) {
            if (err) {
                reject(err);
            } else {
                resolve(resp);
            }
        });
    });
    
    return resp;
}

function decodeForm(form) {
    var ret = {};

    var items = form.split("&");
    items.forEach(item => {
        var split = item.split("=");
        ret[split.shift()] = split.join("=");
    });

    return ret;
}

async function getUserBySAML(samlresponse) {
    let ssoparamresponse = await ssm.getParameter({
        Name: process.env.SSO_SSM_PARAMETER
    }).promise();

    LOG.debug("Param is:");
    LOG.debug(ssoparamresponse['Parameter']['Value']);

    let ssoproperties = JSON.parse(ssoparamresponse['Parameter']['Value']);
    
    var sp_options = {
        entity_id: "https://" + process.env.AWS_LAMBDA_FUNCTION_NAME.replace("-SSOServicer","") + ".local/metadata.xml",
        private_key: "",
        certificate: "",
        assert_endpoint: "",
        allow_unencrypted_assertion: true
    };
    var sp = new saml2.ServiceProvider(sp_options);

    LOG.debug("sp is:");
    LOG.debug(sp);
    
    var idp_options = {
        sso_login_url: ssoproperties['SignInURL'],
        sso_logout_url: ssoproperties['SignOutURL'],
        certificates: [ssoproperties['Certificate']],
        allow_unencrypted_assertion: true
    };
    var idp = new saml2.IdentityProvider(idp_options);

    let samlattrs = await decodeSAMLResponse(sp, idp, decodeURIComponent(samlresponse));

    LOG.debug("samlattrs is:");
    LOG.debug(samlattrs);

    return {
        'guid': samlattrs['user']['attributes']['guid'][0],
        'email': samlattrs['user']['attributes']['email'][0],
        'samlresponse': decodeURIComponent(samlresponse),
        'ssoprops': ssoproperties
    };
}

async function handleSAMLResponse(event) {
    let body = event.body;
    if (event.isBase64Encoded) {
        body = Buffer.from(event.body, 'base64').toString('utf8');
    }

    LOG.debug("Body is:");
    LOG.debug(body);

    var form = decodeForm(body);

    LOG.debug("Form is:");
    LOG.debug(form);

    let user = await getUserBySAML(form['SAMLResponse']);

    LOG.debug("User is:");
    LOG.debug(user);

    let ssoroleassume = await sts.assumeRole({
        RoleArn: process.env.SSO_ROLE,
        RoleSessionName: user.guid
    }).promise();

    LOG.debug('https://signin.aws.amazon.com/federation?Action=getSigninToken&Session=' + encodeURIComponent(JSON.stringify({
		'sessionId': ssoroleassume.Credentials.AccessKeyId,
		'sessionKey': ssoroleassume.Credentials.SecretAccessKey,
		'sessionToken': ssoroleassume.Credentials.SessionToken,
	})));

    let signintoken = await axios.get('https://signin.aws.amazon.com/federation?Action=getSigninToken&Session=' + encodeURIComponent(JSON.stringify({
		'sessionId': ssoroleassume.Credentials.AccessKeyId,
		'sessionKey': ssoroleassume.Credentials.SecretAccessKey,
		'sessionToken': ssoroleassume.Credentials.SessionToken,
    })));
    
    let c9membership = await cloud9.createEnvironmentMembership({
        environmentId: process.env.ENVIRONMENT_ID,
        permissions: "read-write",
        userArn: "arn:aws:sts::" + process.env.ACCOUNT_ID + ":assumed-role/" + process.env.AWS_LAMBDA_FUNCTION_NAME.replace("-SSOServicer","") + "-SSOUser/" + user.guid
    }).promise().catch(() => { });

    let consolebase = 'https://console.aws.amazon.com/cloud9/ide/';
    if (process.env.AWS_REGION != "us-east-1") {
        consolebase = 'https://' + process.env.AWS_REGION + '.console.aws.amazon.com/cloud9/ide/';
    }

    return {
        "statusCode": 302,
        "headers": {
            "Location": 'https://signin.aws.amazon.com/federation?Action=login&Destination=' + encodeURIComponent(consolebase + process.env.ENVIRONMENT_ID) + '&SigninToken=' + signintoken.data['SigninToken']
        }
    };
}

exports.handler = async (event, context) => {
    LOG.debug(event);

    if (event.routeKey == "GET /") {
        let ssoparamresponse = await ssm.getParameter({
            Name: process.env.SSO_SSM_PARAMETER
        }).promise();

        let ssoproperties = JSON.parse(ssoparamresponse['Parameter']['Value']);
        
        return {
            "statusCode": 302,
            "headers": {
                "Location": ssoproperties['SignOutURL']
            }
        };
    } else if (event.routeKey == "POST /") {
        try {
            let resp = await handleSAMLResponse(event);

            return resp;
        } catch(err) {
            LOG.error(err);
        }

        return {
            "statusCode": 500,
            "isBase64Encoded": false,
            "headers": {
                "Content-Type": "index/html"
            },
            "body": ""
        };
    } else {
        return context.succeed();
    }
};
