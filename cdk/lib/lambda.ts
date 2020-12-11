import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as iam from "@aws-cdk/aws-iam";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as s3 from "@aws-cdk/aws-s3";
import { S3EventSource } from "@aws-cdk/aws-lambda-event-sources";

export function createWebSocketConnectLambda(
  scope: cdk.Construct,
  table: dynamodb.Table
): lambda.Function {
  const cnnectLambda = new lambda.Function(scope, "web-socket-connect", {
    code: new lambda.AssetCode("lib/handler"),
    handler: "webSocket/connect.handler",
    runtime: lambda.Runtime.NODEJS_12_X,
    environment: {
      TABLE_NAME: table.tableName,
      TABLE_KEY: "connectionId",
    },
  });

  // Dynamoへの書き込み権限
  table.grantWriteData(cnnectLambda);

  return cnnectLambda;
}

export function createWebSocketDisconnectLambda(
  scope: cdk.Construct,
  table: dynamodb.Table
): lambda.Function {
  const disconnectLambda = new lambda.Function(
    scope,
    "web-socket-ondisconnect",
    {
      code: new lambda.AssetCode("lib/handler"),
      handler: "webSocket/disconnect.handler",
      runtime: lambda.Runtime.NODEJS_12_X,
      environment: {
        TABLE_NAME: table.tableName,
        TABLE_KEY: "connectionId",
      },
    }
  );

  // Dynamoへの書き込み権限
  table.grantWriteData(disconnectLambda);

  return disconnectLambda;
}

export function createSendMessageLambda(
  scope: cdk.Construct,
  resouce: string,
  endpoint: string,
  bucket: s3.Bucket,
  table: dynamodb.Table
): lambda.Function {
  const policy = new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    resources: [resouce],
    actions: ["execute-api:ManageConnections"],
  });

  const role = new iam.Role(scope, "sendMessageLambdaRole", {
    assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
  });
  role.addToPolicy(policy);
  role.addManagedPolicy(
    iam.ManagedPolicy.fromAwsManagedPolicyName(
      "service-role/AWSLambdaBasicExecutionRole"
    )
  );

  const sendMessageLambda = new lambda.Function(scope, "sendMessageLambda", {
    code: new lambda.AssetCode("lib/handler"),
    handler: "webSocket/sendMessage.handler",
    runtime: lambda.Runtime.NODEJS_12_X,
    role,
    environment: {
      ENDPOINT: endpoint,
      TABLE_NAME: table.tableName,
      TABLE_KEY: "connectionId",
    },
  });

  // Triggered by Put to s3
  sendMessageLambda.addEventSource(
    new S3EventSource(bucket, {
      events: [s3.EventType.OBJECT_CREATED],
    })
  );

  // Grant for dynamoDB.table
  table.grantReadWriteData(sendMessageLambda);

  return sendMessageLambda;
}
