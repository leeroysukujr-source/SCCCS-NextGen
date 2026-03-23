import React, { Suspense } from 'react';
import './AssignmentWhiteboard.css';

// Lazy load the actual whiteboard to keep initial bundle small
const Whiteboard = React.lazy(() => import('../../../pages/video-buddy/Whiteboard'));

export default function AssignmentWhiteboard({ groupId, roomName }) {
    return (
        <div className="assignment-whiteboard">
            <Suspense fallback={<div className="whiteboard-loading">Unrolling Canvas...</div>}>
                <Whiteboard roomId={`asg-group-${groupId}`} />
            </Suspense>
        </div>
    );
}
