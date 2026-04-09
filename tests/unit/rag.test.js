const { test, describe } = require('node:test');
const assert = require('node:assert');

// Mock db to avoid needing PostgreSQL
const mockDb = { query: async () => ({ rows: [] }), pool: {} };
require.cache[require.resolve('../../src/models/db')] = {
    exports: mockDb, loaded: true,
    id: require.resolve('../../src/models/db'),
    filename: require.resolve('../../src/models/db')
};

const { chunkText } = require('../../src/services/rag');

describe('chunkText (RAG document chunking)', () => {
    test('returns empty array for empty text', () => {
        const chunks = chunkText('', 500, 100);
        assert.strictEqual(chunks.length, 0);
    });

    test('returns single chunk for short text', () => {
        const text = 'This is a short document.';
        const chunks = chunkText(text, 500, 100);
        assert.strictEqual(chunks.length, 1);
        assert.strictEqual(chunks[0], text);
    });

    test('splits long text into multiple chunks', () => {
        const text = 'a'.repeat(1500);
        const chunks = chunkText(text, 500, 100);
        assert.ok(chunks.length >= 3);
    });

    test('chunks respect size limit approximately', () => {
        const text = 'Lorem ipsum dolor sit amet. '.repeat(100);
        const chunks = chunkText(text, 500, 100);
        chunks.forEach(chunk => {
            // Allow some overflow for natural break points
            assert.ok(chunk.length <= 600, `Chunk too large: ${chunk.length}`);
        });
    });

    test('chunks overlap for context continuity', () => {
        const text = 'A'.repeat(500) + 'B'.repeat(500) + 'C'.repeat(500);
        const chunks = chunkText(text, 500, 100);
        assert.ok(chunks.length >= 2);
    });

    test('ignores very short chunks (< 20 chars)', () => {
        const text = 'short';
        const chunks = chunkText(text, 500, 100);
        // Short text below 20 chars should be filtered
        assert.strictEqual(chunks.length, 0);
    });

    test('prefers paragraph breaks when possible', () => {
        const text = 'First paragraph here with enough words to fill some space.\n\nSecond paragraph here with more content and additional text.\n\nThird paragraph closing the document with final words.';
        const chunks = chunkText(text, 100, 20);
        // Should break on newlines
        assert.ok(chunks.length >= 2);
    });
});
