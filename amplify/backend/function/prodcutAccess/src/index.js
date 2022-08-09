const AWS = require('aws-sdk')
AWS.config.update({ region: process.env.TABLE_REGION });

const dynamodb = new AWS.DynamoDB.DocumentClient();

let tableName = "product";
if (process.env.ENV && process.env.ENV !== "NONE") {
  tableName = tableName + '-' + process.env.ENV;
}


const getWarehouseProductRequest = async (warehouse_id, product_id) => {
  const params = {
    TableName: tableName,
    // IndexName: 'Index',
    KeyConditionExpression: 'pk = :pk and begins_with(sk, :sk)',
    ExpressionAttributeValues: {
      ':pk': warehouse_id,
      ':sk': product_id || "product"
    }
  };

  try {
    const {Items} =  await dynamodb.query(params).promise()
    return {Items}
  } catch (error) {
    return error
  }
}


const getProductDetails = async (product_id) => {
  const params = {
    TableName: tableName,
    IndexName: 'sk-pk',
    KeyConditionExpression: 'sk = :sk and begins_with(pk, :pk)',
    ExpressionAttributeValues: {
      ':pk': product_id,
      ':sk': product_id
    }
  };

  try {
    const {Items} =  await dynamodb.query(params).promise()
    return {Items}
  } catch (error) {
    return {error}
  }
}

const listWarehousesByProduct = async (product_id) => {
  const params = {
    TableName: tableName,
    IndexName: 'sk-pk',
    KeyConditionExpression: 'sk = :sk and begins_with(pk, :pk)',
    ExpressionAttributeValues: {
      ':sk': product_id,
      ':pk': "warehouse"
    }
  };

  try {
    const {Items} =  await dynamodb.query(params).promise()
    return {Items}
  } catch (error) {
    return {error}
  }
}

exports.handler = async (event, context) => {

  switch (event.path) {
    case 'getWarehouseProductTotalValue':
      const {Items: warehouseItems} = await getWarehouseProductRequest(event.params.warehouse_id, event.params.product_id)
      const {Items: productItems} = await getProductDetails(event.params.product_id)
      const {inventory} = warehouseItems[0] || {}
      const {price, name} = productItems[0] || {}
      console.log(`warehouse_id: ${event.params.warehouse_id} | `, `product name: ${name} | `, `totalValue: $${price * inventory}`);
      break;
    case 'listWarehousesByProduct':
      const {Items: productInventoryByWarehouse} = await listWarehousesByProduct(event.params.product_id)
      console.log(JSON.stringify({productInventoryByWarehouse}));
      break;
    default:
      // code
      break;
  }
  return true;
};
