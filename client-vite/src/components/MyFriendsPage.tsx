// @ts-nocheck
import React from 'react';

const MyFriendsPage = ({ connections }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold mb-6">My Friends</h1>
    {connections.friends && connections.friends.length > 0 ? (
      <ul className="bg-white p-4 rounded-lg shadow-md">
        {connections.friends.map((friend) => (
          <li key={friend._id} className="flex items-center justify-between p-3 border-b last:border-b-0">
            <span className="font-medium">{friend.name}</span>
            <span className="text-gray-500">{friend.email}</span>
          </li>
        ))}
      </ul>
    ) : <p>You have no friends yet. Use the Search Friends tab to find people!</p>}
  </div>
);

export default MyFriendsPage;

