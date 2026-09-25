// @ts-nocheck
import React from 'react';

const NewConnectionPage = ({ connections, onAccept }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold mb-6">New Connection Requests</h1>
    {connections.receivedRequests && connections.receivedRequests.length > 0 ? (
      <ul className="bg-white p-4 rounded-lg shadow-md">
        {connections.receivedRequests.map((request) => (
          <li key={request._id} className="flex items-center justify-between p-3 border-b last:border-b-0">
            <div>
              <span className="font-medium">{request.name}</span>
              <span className="text-gray-500 ml-4">{request.email}</span>
            </div>
            <button onClick={() => onAccept(request._id)} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              Accept
            </button>
          </li>
        ))}
      </ul>
    ) : <p>You have no new connection requests.</p>}
  </div>
);

export default NewConnectionPage;

