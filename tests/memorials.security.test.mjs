import assert from 'node:assert/strict';
import { test } from 'node:test';
import { issueMemorialSession, toAdminMemorial, toPublicMemorial, verifyMemorialSession } from '../api/_memorials.ts';

const row = {
  id: 'memorial-1',
  slug: 'memorial-demo',
  full_name: 'Memorial Demo',
  visibility: 'private',
  requires_approval: true,
  editor_email: 'familia@example.com',
  editor_password: 'password-test',
  access_code: 'CODE123',
  client_name: 'Familia Demo',
  client_contact: '555-0100',
};

test('el DTO público excluye códigos, credenciales y datos de cliente', () => {
  const dto = toPublicMemorial(row);
  assert.equal(dto.has_family_editor, true);
  for (const key of ['access_code', 'editor_email', 'editor_password', 'client_name', 'client_contact']) {
    assert.equal(Object.hasOwn(dto, key), false, `${key} no debe estar en el DTO público`);
  }
});

test('solo el DTO admin contiene campos internos', () => {
  const dto = toAdminMemorial(row);
  assert.equal(dto.access_code, row.access_code);
  assert.equal(dto.editor_email, row.editor_email);
  assert.equal(dto.editor_password, row.editor_password);
  assert.equal(dto.client_contact, row.client_contact);
});

test('la sesión firmada está acotada a rol y memorial', () => {
  process.env.MEMORIAL_SESSION_SECRET = 'test-only-secret-with-enough-entropy';
  const token = issueMemorialSession('visitor', row.id);
  assert.equal(verifyMemorialSession(token, 'visitor', row.id), true);
  assert.equal(verifyMemorialSession(token, 'family', row.id), false);
  assert.equal(verifyMemorialSession(token, 'visitor', 'another-memorial'), false);
  assert.equal(verifyMemorialSession(`${token}x`, 'visitor', row.id), false);
});
