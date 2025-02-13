import * as SDK from "aws-sdk/clients/dynamodb";
import * as CDK from "@aws-cdk/aws-dynamodb";

/******************************************************************************************************************************************
 *                                                           CDK TYPE EXTENSIONS                                                          *
 ******************************************************************************************************************************************/

/**
 * Unified DynamoDB props object holding all the information regarding a table
 */
export interface TableProps<DataType, IndexName extends string> extends CDK.TableProps {
  tableName: string;
  partitionKey: Attribute<DataType>;
  sortKey?: Attribute<DataType>;
  indexMap?: IndexMap<IndexName, DataType>;
}

/**
 * Adaptive GlobalSecondaryIndex forcing attribute names based on the data type of the object being stored
 */
export interface GlobalIndex<DataType, IndexName extends string> extends CDK.GlobalSecondaryIndexProps {
  indexType: "Global";
  indexName: IndexName;
  partitionKey: Attribute<DataType>;
  sortKey?: Attribute<DataType>;
}

/**
 * Adaptive LocalSecondaryIndex forcing attribute names based on the data type of the object being stored
 */
export interface LocalIndex<DataType, IndexName extends string> extends CDK.LocalSecondaryIndexProps {
  indexType: "Local";
  indexName: IndexName;
  sortKey: Attribute<DataType>;
}

/**
 * Adaptive attribute forcing the name of the attributes based on the data model
 */
export interface Attribute<T> extends CDK.Attribute {
  name: Extract<keyof T, string>;
}

export type IndexMap<IndexName extends string, DataType> = Record<IndexName, GlobalIndex<DataType, IndexName> | LocalIndex<DataType, IndexName>>;

/******************************************************************************************************************************************
 *                                                       CDK TO SDK TYPE EXTENSIONS                                                       *
 ******************************************************************************************************************************************/

/**
 * Constructs the native table props object as defined by DynamoDB SDK team
 */
export class CreateTableInput implements SDK.CreateTableInput {
  public ProvisionedThroughput: SDK.ProvisionedThroughput = { ReadCapacityUnits: 10, WriteCapacityUnits: 10 };
  public KeySchema: SDK.KeySchema = [];
  public TableName: SDK.TableName;
  public GlobalSecondaryIndexes?: SDK.GlobalSecondaryIndexList;
  public LocalSecondaryIndexes?: SDK.LocalSecondaryIndexList;
  public AttributeDefinitions: SDK.AttributeDefinitions = [];

  constructor(tableProps: TableProps<any, any>) {
    this.TableName = tableProps.tableName;
    this.addKey(this.KeySchema, "HASH", tableProps.partitionKey);
    this.addKey(this.KeySchema, "RANGE", tableProps.sortKey);

    for (const mapKey in tableProps.indexMap) {
      const { indexType, indexName } = tableProps.indexMap[mapKey];

      if (indexType === "Local") {
        const { sortKey } = tableProps.indexMap[mapKey] as LocalIndex<any, any>;
        const index = new LocalSecondaryIndex(indexName);
        this.LocalSecondaryIndexes ||= [];
        this.addKey(index.KeySchema, "HASH", tableProps.partitionKey);
        this.addKey(index.KeySchema, "RANGE", sortKey);
        this.LocalSecondaryIndexes.push(index);
      } else if (indexType === "Global") {
        const { partitionKey, sortKey } = tableProps.indexMap[mapKey] as GlobalIndex<any, any>;
        const index = new GlobalSecondaryIndex(indexName);
        this.GlobalSecondaryIndexes ||= [];
        this.addKey(index.KeySchema, "HASH", partitionKey);
        this.addKey(index.KeySchema, "RANGE", sortKey);
        this.GlobalSecondaryIndexes.push(index);
      }
    }
  }

  protected addKey(keySchema: SDK.KeySchema, keyType: "HASH" | "RANGE", attribute?: Attribute<any>) {
    if (attribute) {
      keySchema.push({ AttributeName: String(attribute.name), KeyType: keyType });
      const notExists = !this.AttributeDefinitions.find(({ AttributeName }) => AttributeName === attribute.name);
      if (notExists) {
        this.AttributeDefinitions.push({ AttributeName: String(attribute.name), AttributeType: attribute.type || "S" });
      }
    }
  }
}

/**
 * Native GlobalSecondaryIndex implementation creating a basic props
 */
export class GlobalSecondaryIndex implements SDK.GlobalSecondaryIndex {
  ProvisionedThroughput: SDK.ProvisionedThroughput = { ReadCapacityUnits: 10, WriteCapacityUnits: 10 };
  KeySchema: SDK.KeySchema = [];
  Projection: SDK.Projection = { ProjectionType: "ALL" };

  constructor(public IndexName: string) {}
}

/**
 * Native GlobalSecondaryIndex implementation creating a basic props
 */
export class LocalSecondaryIndex implements SDK.LocalSecondaryIndex {
  ProvisionedThroughput: SDK.ProvisionedThroughput = { ReadCapacityUnits: 10, WriteCapacityUnits: 10 };
  KeySchema: SDK.KeySchema = [];
  Projection: SDK.Projection = { ProjectionType: "ALL" };

  constructor(public IndexName: string) {}
}
