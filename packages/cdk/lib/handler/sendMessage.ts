import * as AWS from "aws-sdk";

export async function handler(event: any): Promise<any> {
  console.log(`sendMessage ${JSON.stringify(event)}`);

  const endpoint = process.env.ENDPOINT

  const apiGateway = new AWS.ApiGatewayManagementApi({ endpoint });

  const client = new AWS.DynamoDB.DocumentClient();

  const result = await client
    .scan({ TableName: process.env.TABLE_NAME || "" })
    .promise();

  for (const data of result.Items ?? []) {
    const params = {
      Data: "画像がアップロードされました",
      ConnectionId: data.connectionId,
    };

    try {
      await apiGateway.postToConnection(params).promise();
    } catch (err) {
      if (err.statusCode === 410) {
        console.log("Found stale connection, deleting " + data.connectionId);
        await client
          .delete({
            TableName: process.env.TABLE_NAME || "",
            Key: { [process.env.TABLE_KEY || ""]: data.connectionId },
          })
          .promise();
      } else {
        console.log("Failed to post. Error: " + JSON.stringify(err));
      }
    }
  }
}
