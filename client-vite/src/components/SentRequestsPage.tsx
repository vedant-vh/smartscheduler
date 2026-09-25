// @ts-nocheck
import React from 'react';

const SentRequestsPage = ({ connections }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold mb-6">Sent Requests</h1>
    {connections.sentRequests && connections.sentRequests.length > 0 ? (
      <ul className="bg-white p-4 rounded-lg shadow-md">
        {connections.sentRequests.map((request) => (
          <li key={request._id} className="flex items-center justify-between p-3 border-b last:border-b-0">
            <div>
              <span className="font-medium">{request.name}</span>
              <span className="text-gray-500 ml-4">{request.email}</span>
            </div>
            <span className="text-yellow-500 font-semibold">Pending</span>
          </li>
        ))}
      </ul>
    ) : <p>You have not sent any connection requests.</p>}
  </div>
);

export default SentRequestsPage;

