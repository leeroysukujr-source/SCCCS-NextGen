import { useEffect, useState, useMemo } from 'react';
import { createTLStore, defaultShapeUtils, throttle } from 'tldraw';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export function useYjsStore({ roomId = 'example', hostUrl = 'ws://localhost:1234' }) {
    const [store] = useState(() => {
        const store = createTLStore({ shapeUtils: defaultShapeUtils });
        return store;
    });

    const [status, setStatus] = useState('connecting');

    useEffect(() => {
        const yDoc = new Y.Doc();
        const roomName = `whiteboard-${roomId}`;
        const provider = new WebsocketProvider(hostUrl, roomName, yDoc);

        const yStore = yDoc.getMap('tldraw');

        // Sync from Yjs to Tldraw
        const handleYjsUpdate = (event) => {
            const changes = event.changes.keys;
            const toRemove = [];
            const toUpdate = [];

            yStore.forEach((value, snapshotId) => {
                const record = JSON.parse(value);
                toUpdate.push(record);
            });

            // Note: In a real implementation, we would only apply deltas.
            // This is a robust-enough sync for a demo/protype level.
            store.mergeRemoteChanges(() => {
                store.put(toUpdate);
            });
        };

        yStore.observe(handleYjsUpdate);

        // Sync from Tldraw to Yjs
        const handleStoreUpdate = (update) => {
            if (update.source === 'remote') return;

            yDoc.transact(() => {
                Object.entries(update.changes.added).forEach(([id, record]) => {
                    yStore.set(id, JSON.stringify(record));
                });
                Object.entries(update.changes.updated).forEach(([id, [from, to]]) => {
                    yStore.set(id, JSON.stringify(to));
                });
                Object.entries(update.changes.removed).forEach(([id, record]) => {
                    yStore.delete(id);
                });
            });
        };

        const unlisten = store.listen(handleStoreUpdate, { scope: 'document', source: 'user' });

        provider.on('status', ({ status }) => setStatus(status));

        return () => {
            unlisten();
            provider.disconnect();
            yDoc.destroy();
        };
    }, [store, roomId, hostUrl]);

    return store;
}
