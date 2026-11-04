import { describe, it, expect } from 'vitest';
import listHandler from '../../api/list.js';
import rotateHandler from '../../api/keys/rotate.js';
import disableViewHandler from '../../api/keys/disable-view.js';

function createMockReqRes({ method = 'GET', headers = {}, body = {}, query = {} } = {}) {
  const req = {
    method,
    headers: { ...headers },
    body,
    query
  };
  let statusCode = 200;
  let responseData = null;
  const resHeaders = {};

  const res = {
    setHeader(k, v) { resHeaders[k] = v; },
    status(code) { statusCode = code; return res; },
    json(data) { responseData = data; return res; },
    end(data) { if (data) responseData = data; return res; },
    getStatusCode() { return statusCode; },
    getData() { return responseData; }
  };

  return { req, res };
}

describe('API Endpoints integration', () => {
  let editKey = '';
  let viewKey = '';
  let listId = '';

  it('creates a list with edit and view keys', async () => {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        title: 'Project Antigravity',
        text: `TODO: Project Antigravity
+ Planning
- [ ] Setup repo
- [x] Initial design`
      }
    });

    await listHandler(req, res);
    expect(res.getStatusCode()).toBe(201);
    const data = res.getData();
    expect(data.title).toBe('Project Antigravity');
    expect(data.editKey).toBeDefined();
    expect(data.viewKey).toBeDefined();
    expect(data.items.length).toBeGreaterThan(0);

    editKey = data.editKey;
    viewKey = data.viewKey;
    listId = data.id;
  });

  it('fetches list using edit key with role "edit"', async () => {
    const { req, res } = createMockReqRes({
      method: 'GET',
      headers: { 'x-list-key': editKey }
    });

    await listHandler(req, res);
    expect(res.getStatusCode()).toBe(200);
    const data = res.getData();
    expect(data.id).toBe(listId);
    expect(data.role).toBe('edit');
  });

  it('fetches list using view key with role "view"', async () => {
    const { req, res } = createMockReqRes({
      method: 'GET',
      headers: { 'x-list-key': viewKey }
    });

    await listHandler(req, res);
    expect(res.getStatusCode()).toBe(200);
    const data = res.getData();
    expect(data.id).toBe(listId);
    expect(data.role).toBe('view');
  });

  it('rejects modifications when using view key', async () => {
    const { req, res } = createMockReqRes({
      method: 'PATCH',
      headers: { 'x-list-key': viewKey },
      body: {
        ops: [{ op: 'add_category', item: { id: 'c99', text: 'Forbidden' } }]
      }
    });

    await listHandler(req, res);
    expect(res.getStatusCode()).toBe(403);
  });

  it('applies modifications when using edit key', async () => {
    const { req, res } = createMockReqRes({
      method: 'PATCH',
      headers: { 'x-list-key': editKey },
      body: {
        ops: [{
          op: 'add_item',
          item: { id: 'test_task', type: 'todo', text: 'New permitted task', done: false }
        }]
      }
    });

    await listHandler(req, res);
    expect(res.getStatusCode()).toBe(200);
    const data = res.getData();
    expect(data.items.some(i => i.id === 'test_task')).toBe(true);
  });

  it('rotates edit key and verifies old key stops working', async () => {
    const { req: rotReq, res: rotRes } = createMockReqRes({
      method: 'POST',
      headers: { 'x-list-key': editKey },
      body: { newKey: 'rotated-new-key-1234' }
    });

    await rotateHandler(rotReq, rotRes);
    expect(rotRes.getStatusCode()).toBe(200);

    // Old key should now fail
    const { req: oldReq, res: oldRes } = createMockReqRes({
      method: 'GET',
      headers: { 'x-list-key': editKey }
    });
    await listHandler(oldReq, oldRes);
    expect(oldRes.getStatusCode()).toBe(404);

    // New key should succeed
    const { req: newReq, res: newRes } = createMockReqRes({
      method: 'GET',
      headers: { 'x-list-key': 'rotated-new-key-1234' }
    });
    await listHandler(newReq, newRes);
    expect(newRes.getStatusCode()).toBe(200);
  });
});
