import * as AWS from "aws-sdk";

export async function handler(event: any): Promise<any> {
  console.log(`onDisconnect ${JSON.stringify(event)}`);

  const client = new AWS.DynamoDB.DocumentClient();

  const result = await client
    .delete({
      TableName: process.env.TABLE_NAME || "",
      Key: { [process.env.TABLE_KEY || ""]: event.requestContext.connectionId },
    })
    .promise();

  console.log(`delete result ${JSON.stringify(result)}`);

  return {
    statusCode: 200,
    body: "onDisconnect.",
  };
}
