# AWS Cloud9 SSO Integration

<img src="https://raw.githubusercontent.com/iann0036/cloud9-sso/main/assets/screen1.png" width="245" height="145">

:exclamation: **CAUTION:** This project is currently in beta stages. Some resources may not work as expected. Please [report these](https://github.com/iann0036/cloud9-sso/issues) if you find them.


## Installation

You must create the execution infrastructure (stack) then manually follow the SSO Setup steps to complete installation.

### Execution Infrastructure

[![Launch Stack](https://cdn.rawgit.com/buildkite/cloudformation-launch-stack-button-svg/master/launch-stack.svg)](https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=myc9env&templateURL=https://s3.amazonaws.com/ianmckay-us-east-1/cloud9-sso/template.yaml)

Click the above link to deploy the stack to your environment. This stack creates a Cloud9 environment and the SAML handling API Gateway / Lambda combination.

If you prefer, you can also manually upsert the [template.yaml](https://github.com/iann0036/cloud9-sso/blob/master/template.yaml) stack from source.

### SSO Setup

Once the execution infrastructure is installed, navigate to [AWS SSO > Applications](https://console.aws.amazon.com/singlesignon/home?region=us-east-1#/applications).

Click on the **Add a new application** button and select the **Add a custom SAML 2.0 application** option.

Change the display name to the desired SSO application title. I recommend making this the same as the environment name.

At the bottom of the screen, under **Application metadata**, click the **If you don't have a metadata file, you can manually type your metadata values.** option. Fill in the fields with the outputs of your CloudFormation stack, then click **Save Changes**.

![](assets/screen2.png)

Open Systems Manager and navigate to the **Parameter Store** section. Select your parameter, named as _environment_-SSOArgs and click **Edit**. In the value field, replace the empty values for **SignInURL** and **SignOutURL** with the values from the SSO application fields **AWS SSO sign-in URL** and **AWS SSO sign-out URL**, respectively.

Click the **Download certificate** button and open the certificate in a text editor. Replace every new line with the literal string `\n` and replace the empty **Certificate** value (see screenshot). Finally, hit **Save changes** on the parameter.

![](assets/screen4.png)

Back on the SSO application, click the **Attribute mappings** tab. Create two extra attributes and fill in the details as per the following:

| User attribute in the application | Maps to this string value or user attribute in AWS SSO | Format |
| --- | --- | --- |
| Subject | ${user:AD_GUID} | unspecified |
| guid | ${user:AD_GUID} | unspecified |
| email | ${user:email} | unspecified |

Then click **Save changes**.

![](assets/screen3.png)

Click the **Assigned users** tab and assign users as appropriate. Once assigned those users will have the SSO access provisioned.
