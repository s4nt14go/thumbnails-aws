<h1 align="center">Thumbnails generator with AWS Lambda, API Gateway, AppSync, DynamoDB, S3 and SAM 📢 </h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000" />
  <a href="#" target="_blank">
    <img alt="License: ISC" src="https://img.shields.io/badge/License-ISC-yellow.svg" />
  </a>
</p>

### Description

Build a page with a drag and drop area in which you will be able to generate a 200px thumbnail version of your jpg/jpeg/png files.<br /><br />
![alt text](./demo.gif)

### Frontend part

This project is composed by two repositories: this one which is the api backend and this [React frontend](https://github.com/s4nt14go/thumbnails-react) is the other. Start with this repository and then continue with frontend.

### Requirements:
* [AWS account](https://aws.amazon.com)
* [AWS CLI](https://aws.amazon.com/cli)
* [AWS Serverless Application Model (SAM) CLI](https://aws.amazon.com/serverless/sam)

### Instructions

1. In this first step we will use the AWS console to setup AppSync, which under the hoods will deploy a DynamoDB table. AppSync is the managed GraphQL service which will handle our database operations, that will contain the urls for the images resized, as well as gives us real-time updates sent to our frontend.<br /><br />
Use your browser to log into your AWS console and create a new AppSync API (check you create it into the AWS region you will be working in this project):<br /><br />
![alt text](./imgs/1.1createAPI.png "Create API")<br /><br />
![alt text](./imgs/1.2startWizard.png "Start wizard")<br /><br />
Make sure you use `ResizedUrl` as your model name as this is the name used in the lambda function we will create<br /><br />
![alt text](./imgs/1.3createModel.png "Create model")<br /><br /> 
![alt text](./imgs/1.4apiName.png "Name API")<br /><br />
This will create the DynamoDB table as well as our GraphQL schema and resolvers. Go into your new API created and take note of the API URL endpoint and API KEY<br /><br />
![alt text](./imgs/1.5settings.png "API endpoint and key")<br /><br />
Inside Schema download the `schema.json` that we will need in the frontend<br /><br />
![alt text](./imgs/1.6schema.png "Download schema.json")<br /><br />
Now we will continue to deploy the rest of our infrastructure with Serverless Application Model (SAM)

1. Clone this repo<br /><br />
`git clone https://github.com/s4nt14go/thumbnails-aws`
1. Check your are using your AWS credentials and the region you want<br /><br />
`aws configure list`
1. We will first build the project locally and then deploy it, so `cd` into the repo root folder and run<br /><br />
`sam build`
1. Make a S3 bucket which we will use when deploying. For the following parts I will use some names as examples, you may have to choose different ones because they have to be unique (for example you can add a random suffix to make them unique)<br /><br />
`aws s3 mb s3://stack-thumbnails-artifacts`
1. Running `sam deploy` we will deploy the resources declared into `template.yml`<br /><br />
`sam deploy --stack-name thumbnails --s3-bucket stack-thumbnails-artifacts --capabilities CAPABILITY_IAM`<br /><br />
One of the lambdas deployed is `upload` that we will use from the React app to get an url to upload the image to be resized, also we are deploying a bucket where we will upload our image to.<br /><br />
Once CloudFormation finishes deploying our `template.yml` it will output two values we will need for the frontend:
    - `uploadApi`: the url from where we will get an url to upload our images
    - `imageToResize`: the bucket name where we will upload the images
1. Go into the `resize` lambda inside your AWS console and set the environment variables `APPSYNC_ENDPOINT_URL` and `APPSYNC_API_KEY` (you don't need to set `AWS_REGION` as this is automatically injected in lambdas)<br /><br />
![alt text](./imgs/2.1envVars.png "Evironment variables")<br /><br />
![alt text](./imgs/2.2edit.png "Evironment variables")<br /><br />
1. Let's check the lambda function `upload`.<br /><br />
`curl --request GET --url "<uploadApi output by CloudFormation>=test.txt"`<br /><br />
TIP: When you copy the `uploadApi` output by CloudFormation, check it didn't get break out in two lines by your terminal output, the url should end with `amazonaws.com/dev/presigned-url?fileName`<br /><br />
If everything went well you should receive a link to upload the fictitious file `text.txt`.    
1. Every time an image is uploaded to bucket `imageToResize`, lambda function `resize` will run and resize it, and also will launch a mutation to AppSync, so the React app (that will be subscribed to receive real-time changes) will pick up the change and show the resized image.<br /><br />
So to check that lambda `resized` works well, we can upload an image to the bucket and we should see the `resize` logs printing `Successfully resized <your image> and uploaded to <your bucket>` along with the `AppSync response`.<br /><br />
So let's copy an image to S3, using the value outputted by CloudFormation when created bucket `imageToResize`<br /><br />
`aws s3 cp resize/test.jpeg s3://<imageToResize bucket name output by CloudFormation>/test.jpeg`<br /><br />
Check inside Lambda console the `thumbnails-resize...` function, click in the "Monitoring" tab and then the "View logs in CloudWatch" button, select the most recent "Log stream" and you should see the successful message. You can also check in your S3 bucket `<imageToResize>-resized` the thumbnail created<br /><br />    
1. Now that everything works well go ahead with the [React client](https://github.com/s4nt14go/thumbnails-react)!

### Cleanup
After you do the frontend part and you are done with the project do this to delete the created resources 
1. Empty both buckets: the one used to upload the original image as well as the one where we stored the image resized.<br /><br />
`aws s3 rm s3://<imageToResize bucket name given by CloudFormation> --recursive`<br />
`aws s3 rm s3://<imageToResize bucket name given by CloudFormation>-resized --recursive`<br /><br />
1. Delete your stack and table<br /><br />
`aws cloudformation delete-stack --stack-name thumbnails`<br />
`aws dynamodb delete-table --table-name ResizedUrlTable`<br /><br />
1. Empty and delete the bucket used by CloudFormation to deploy<br /><br />
`aws s3 rm s3://<your stack-thumbnails-artifacts> --recursive`<br />
`aws s3 rb s3://<your stack-thumbnails-artifacts>`<br /><br />
1. Delete AppSync API<br /><br />
`aws appsync delete-graphql-api --api-id <your api id>`
