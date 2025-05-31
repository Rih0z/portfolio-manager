const modulePath = '../../../src/utils/dynamoDbService';

let sendMock;
let GetItemCommandMock;
let PutItemCommandMock;
let UpdateItemCommandMock;
let DeleteItemCommandMock;

beforeEach(() => {
  jest.resetModules();
  sendMock = jest.fn();
  GetItemCommandMock = jest.fn(params => ({ params }));
  PutItemCommandMock = jest.fn(params => ({ params }));
  UpdateItemCommandMock = jest.fn(params => ({ params }));
  DeleteItemCommandMock = jest.fn(params => ({ params }));
  jest.doMock('@aws-sdk/client-dynamodb', () => ({
    DynamoDBClient: jest.fn().mockReturnValue({ send: sendMock }),
    GetItemCommand: GetItemCommandMock,
    PutItemCommand: PutItemCommandMock,
    UpdateItemCommand: UpdateItemCommandMock,
    DeleteItemCommand: DeleteItemCommandMock,
    QueryCommand: jest.fn(),
    ScanCommand: jest.fn(),
  }));
  const marshallMock = jest.fn(obj => obj);
  const unmarshallMock = jest.fn(obj => obj);
  jest.doMock('@aws-sdk/util-dynamodb', () => ({
    marshall: marshallMock,
    unmarshall: unmarshallMock
  }));
});

afterEach(() => {
  jest.resetModules();
});

describe('dynamoDbService high-level functions', () => {
  test('addItem uses PutItemCommand and returns result', async () => {
    const service = require(modulePath);
    sendMock.mockResolvedValue({ ok: true });
    const result = await service.addItem('TestTable', { id: '1' });
    expect(PutItemCommandMock).toHaveBeenCalledWith({ TableName: 'TestTable', Item: { id: '1' } });
    expect(sendMock).toHaveBeenCalledWith({ params: { TableName: 'TestTable', Item: { id: '1' } } });
    expect(result).toEqual({ ok: true });
  });

  test('getItem uses GetItemCommand and unmarshalls result', async () => {
    const service = require(modulePath);
    sendMock.mockResolvedValue({ Item: { id: '1' } });
    const result = await service.getItem('TestTable', { id: '1' });
    expect(GetItemCommandMock).toHaveBeenCalledWith({ TableName: 'TestTable', Key: { id: '1' } });
    expect(result).toEqual({ id: '1' });
  });

  test('deleteItem uses DeleteItemCommand', async () => {
    const service = require(modulePath);
    sendMock.mockResolvedValue({ deleted: true });
    const result = await service.deleteItem('Test', { id: '1' });
    expect(DeleteItemCommandMock).toHaveBeenCalledWith({ TableName: 'Test', Key: { id: '1' } });
    expect(result).toEqual({ deleted: true });
  });

  test('updateItem uses UpdateItemCommand with marshalled values', async () => {
    const service = require(modulePath);
    sendMock.mockResolvedValue({ updated: true });
    const result = await service.updateItem('Tbl', { id: '1' }, 'SET #n=:v', { '#n': 'name' }, { ':v': 'Alice' });
    expect(UpdateItemCommandMock).toHaveBeenCalled();
    expect(sendMock).toHaveBeenCalled();
    expect(result).toEqual({ updated: true });
  });
});
