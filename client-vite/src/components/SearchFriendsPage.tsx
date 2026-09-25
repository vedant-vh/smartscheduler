// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getToken } from '../utils/auth';
import { debounce } from 'lodash';

const SearchFriendsPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL;

    const performSearch = async (query) => {
        if (!query) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            const token = getToken();
            const res = await fetch(`${API_URL}/search-users?email=${query}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setResults(data);
        } catch (err) {
            toast.error('Search failed');
        } finally {
            setLoading(false);
        }
    };

    // Use useCallback and debounce to create a stable, debounced search function
    const debouncedSearch = useCallback(debounce(performSearch, 300), []);

    useEffect(() => {
        debouncedSearch(searchTerm);
        // Cleanup the debounced function on unmount
        return () => {
            debouncedSearch.cancel();
        };
    }, [searchTerm, debouncedSearch]);

    const handleSendRequest = async (toUserId) => {
        try {
            await fetch(`${API_URL}/send-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({ toUserId }),
            });
            toast.success('Friend request sent!');
            // Refetch search to remove the user from results
            performSearch(searchTerm);
        } catch (err) {
            toast.error('Failed to send request');
        }
    };

    const renderConnectionButton = (user) => {
        switch (user.status) {
            case 'friend':
                return <button disabled className="bg-gray-400 text-white px-4 py-2 rounded cursor-not-allowed">Friends</button>;
            case 'sent':
                return <button disabled className="bg-blue-400 text-white px-4 py-2 rounded cursor-not-allowed">Request Sent</button>;
            default: // 'none'
                return <button onClick={() => handleSendRequest(user._id)} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Add Friend</button>;
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Search for Friends</h1>
            <div className="mb-6">
                <input
                    type="email"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Start typing a user's email..."
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
            </div>
            <div>
                {loading && <p>Searching...</p>}
                {!loading && results.length > 0 && (
                    <ul className="bg-white p-4 rounded-lg shadow-md">
                        {results.map((user) => (
                            <li key={user._id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                                <div>
                                    <span className="font-medium">{user.name}</span>
                                    <span className="text-gray-500 ml-4">{user.email}</span>
                                </div>
                                {renderConnectionButton(user)}
                            </li>
                        ))}
                    </ul>
                )}
                {!loading && searchTerm && results.length === 0 && (
                    <p>No new users found matching your search.</p>
                )}
            </div>
        </div>
    );
};

export default SearchFriendsPage; 
