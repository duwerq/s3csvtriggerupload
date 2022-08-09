/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_S3A3FD664F_BUCKETNAME
Amplify Params - DO NOT EDIT */
const AWS = require('aws-sdk');
const S3 = new AWS.S3();
AWS.config.update({ region: process.env.REGION });
const dynamodb = new AWS.DynamoDB.DocumentClient();
const csv = require('csvtojson');

const tableName = `${process.env.TABLE_NAME}-${process.env.ENV}`;
const batchParams = {
  RequestItems: {
    [`${tableName}`]: []
  },
};

const formatProductsForBatchWrite = (jsonArr) => {
  const batchItems = jsonArr.map(product => {
    const {product_id, name, manufacturer, cost, price} = product
    return {
      PutRequest: {
        Item: {
          pk: product_id,
          sk: product_id,
          name,
          manufacturer,
          cost,
          price
        }
      }
    }
  })
  return batchItems;
}

const formatInventoryForBatchWrite = (jsonArr) => {
  
  const batchItems = [];
  
  jsonArr.forEach(inv => {
    const {warehouse_id, product_id, inventory} = inv
    batchItems.push({
      PutRequest: {
        Item: {
          pk: warehouse_id,
          sk: product_id,
          inventory
        }
      }
    })
    // batchItems.push({
    //   PutRequest: {
    //     Item: {
    //       pk: warehouse_id,
    //       sk: warehouse_id
    //     }
    //   }
    // })
  })
  return batchItems
}

exports.handler = async function (event) {
  console.log('Received S3 event:', JSON.stringify(event, null, 2));
  const putObject = event.Records[0].eventName === "ObjectCreated:Put";
  const Bucket = event.Records[0].s3.bucket.name;
  const Key = event.Records[0].s3.object.key;

  const params = {
    Bucket,
    Key
  };

  const stream = S3.getObject(params).createReadStream();
  const jsonArr = await csv().fromStream(stream);
  if (putObject) {
    try {
      let batchItems = [];
      if (Key.includes('Product')) {
        batchItems = formatProductsForBatchWrite(jsonArr)
      } else if (Key.includes('Inventory')) {
        batchItems = formatInventoryForBatchWrite(jsonArr)
      }
      batchParams.RequestItems[`${tableName}`] = batchItems
      const batchResponse = await dynamodb.batchWrite(batchParams).promise()
      console.log(JSON.stringify({batchResponse}))
    } catch (error) {
      console.log({error})
    }
  }
};