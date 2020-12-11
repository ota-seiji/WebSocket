import * as cdk from "@aws-cdk/core";
import * as apigatewayv2 from "@aws-cdk/aws-apigatewayv2";
import * as iam from "@aws-cdk/aws-iam";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as s3 from "@aws-cdk/aws-s3";
import {
  createWebSocketConnectLambda,
  createSendMessageLambda,
  createWebSocketDisconnectLambda,
} from "./lambda";

export class WebSocketStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 画像アップロード先のバケット
    const webSocketBucket = new s3.Bucket(this, "webSocketBucket");

    // コネクションIDを保持するテーブル
    const webSocketConnection = new dynamodb.Table(
      this,
      "webSocketConnection",
      {
        partitionKey: {
          name: "connectionId",
          type: dynamodb.AttributeType.STRING,
        },
        tableName: "webSocketConnection",
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      }
    );

    const region = "ap-northeast-1";
    const name = "web-socket-api";
    const stageName = "dev";

    // Web Socket用のAPI Gateway
    const api = new apigatewayv2.CfnApi(this, name, {
      name: "WebSocketApi",
      protocolType: "WEBSOCKET",
      routeSelectionExpression: "$request.body.action",
    });

    // $connectのLambda
    const connectLambda = createWebSocketConnectLambda(
      this,
      webSocketConnection
    );

    // $disconnectのLambda
    const disconnectLambda = createWebSocketDisconnectLambda(
      this,
      webSocketConnection
    );

    // s3への画像アップロード契機で動くLambda
    const resouce = `arn:aws:execute-api:${region}:${this.account}:${api.ref}/${stageName}/POST/@connections/*`;
    const endpoint = `https://${api.ref}.execute-api.${region}.amazonaws.com/${stageName}`;
    createSendMessageLambda(
      this,
      resouce,
      endpoint,
      webSocketBucket,
      webSocketConnection
    );

    const policy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [connectLambda.functionArn, disconnectLambda.functionArn],
      actions: ["lambda:InvokeFunction"],
    });

    const role = new iam.Role(this, `${name}-iam-role`, {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });
    role.addToPolicy(policy);

    // $connectルート
    const connectRoute = createRoute(
      this,
      "connect",
      "$connect",
      api,
      role,
      `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${connectLambda.functionArn}/invocations`
    );

    // $disconnectルート
    const disconnectRoute = createRoute(
      this,
      "disconnect",
      "$disconnect",
      api,
      role,
      `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${disconnectLambda.functionArn}/invocations`
    );

    const deployment = new apigatewayv2.CfnDeployment(
      this,
      `${name}-deployment`,
      {
        apiId: api.ref,
      }
    );
    deployment.addDependsOn(api);
    deployment.addDependsOn(connectRoute);
    deployment.addDependsOn(disconnectRoute);

    const stage = new apigatewayv2.CfnStage(this, `${name}-stage`, {
      apiId: api.ref,
      autoDeploy: true,
      deploymentId: deployment.ref,
      stageName,
    });
    stage.addDependsOn(deployment);
  }
}
function createRoute(
  scope: cdk.Construct,
  id: string,
  routeKey: string,
  api: apigatewayv2.CfnApi,
  role: iam.Role,
  integrationUri: string
): apigatewayv2.CfnRoute {
  const integration = new apigatewayv2.CfnIntegration(
    scope,
    `${id}-lambda-integration`,
    {
      apiId: api.ref,
      integrationType: "AWS_PROXY",
      integrationUri,
      credentialsArn: role.roleArn,
    }
  );

  const route = new apigatewayv2.CfnRoute(scope, `${id}-route`, {
    apiId: api.ref,
    routeKey,
    authorizationType: "NONE",
    target: "integrations/" + integration.ref,
  });

  return route;
}
