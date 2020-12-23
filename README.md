# AWS Cloud9 SSO Integration

<img src="https://raw.githubusercontent.com/iann0036/cloud9-sso/main/assets/screen1.png" width="245" height="145">

:exclamation: **CAUTION:** This project is currently in beta stages. Some resources may not work as expected. Please [report these](https://github.com/iann0036/cloud9-sso/issues) if you find them.


## Installation

### Execution Infrastructure

[![Launch Stack](https://cdn.rawgit.com/buildkite/cloudformation-launch-stack-button-svg/master/launch-stack.svg)](https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=myc9env&templateURL=https://s3.amazonaws.com/ianmckay-us-east-1/cloud9-sso/template.yaml)

Click the above link to deploy the stack to your environment. This stack creates a Cloud9 environment and the SAML handling API Gateway / Lambda combination.

If you prefer, you can also manually upsert the [template.yaml](https://github.com/iann0036/cloud9-sso/blob/master/template.yaml) stack from source.

### SSO Setup

_TBC_

![](assets/screen2.png)

![](assets/screen3.png)

![](assets/screen4.png)
