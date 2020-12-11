import * as AWS from "aws-sdk";

export async function handler(event: any): Promise<any> {
  console.log(`onConnect ${JSON.stringify(event)}`);

  const client = new AWS.DynamoDB.DocumentClient();

  // DynamoDBテーブルに保存する
  const result = await client
    .put({
      TableName: process.env.TABLE_NAME || "",
      Item: {
        connectionId: event.requestContext.connectionId,
        date: new Date().toISOString()
      },
    })
    .promise();

  console.log(`put result ${JSON.stringify(result)}`);

  return {
    statusCode: 200,
    body: "onConnect.",
  };
}
