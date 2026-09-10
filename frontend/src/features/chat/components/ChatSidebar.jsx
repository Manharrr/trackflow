import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../api/axios';
import { chatApi } from '../api/chatApi';
import { ConversationItem } from './ConversationItem';

export const ChatSidebar = React.memo(({ conversations, selectedId, onSelect, currentUser }) => {
  const [search, setSearch] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Fetch employees list when New Chat view is opened
  useEffect(() => {
    if (!isNewChatOpen) return;

    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const response = await axiosInstance.get('/chat/directory/', {
          params: { search: employeeSearch }
        });
        // Exclude current user from the list
        const filtered = (response.data.results || []).filter(
          (emp) => String(emp.id) !== String(currentUser?.employee?.id)
        );
        setEmployees(filtered);
      } catch (err) {
        console.error('Failed to load directory:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchEmployees();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [isNewChatOpen, employeeSearch, currentUser]);

  const handleStartChat = async (employee) => {
    try {
      const newConv = await chatApi.createConversation(employee.id);
      setIsNewChatOpen(false);
      onSelect(newConv);
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
  };

  const getPeerUsername = (conv) => {
    if (!conv || !currentUser) return '';
    const peer = conv.participant_one.id === currentUser.id
      ? conv.participant_two
      : conv.participant_one;
    return peer.username?.toLowerCase() || '';
  };

  const filteredConversations = conversations.filter((conv) =>
    getPeerUsername(conv).includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full h-full bg-white border-r border-gray-150 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">Messages</h3>
          <button
            onClick={() => setIsNewChatOpen(!isNewChatOpen)}
            className="p-1.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition duration-150"
            title="New Chat"
          >
            {isNewChatOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        </div>

        {/* Normal Chat Search */}
        {!isNewChatOpen && (
          <div className="relative mt-3">
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 transition duration-150 ease-in-out"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3.5 top-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}

        {/* New Chat Employee Search */}
        {isNewChatOpen && (
          <div className="relative mt-3">
            <input
              type="text"
              placeholder="Search active employees to chat..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className="w-full bg-white border border-indigo-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 transition duration-150 ease-in-out"
              autoFocus
            />
            <svg
              className="w-4 h-4 text-indigo-400 absolute left-3.5 top-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {isNewChatOpen ? (
          /* New Chat Directory List */
          loadingEmployees ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading directory...</div>
          ) : employees.length > 0 ? (
            employees.map((emp) => (
              <div
                key={emp.id}
                onClick={() => handleStartChat(emp)}
                className="flex items-center px-4 py-3 hover:bg-indigo-50/50 cursor-pointer transition duration-150"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm uppercase">
                  {emp.full_name?.charAt(0)}
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-gray-800 truncate">{emp.full_name}</h4>
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full capitalize">
                    {emp.role?.replace('_', ' ')}
                  </span>
                </div>
                <button className="text-xs text-indigo-600 font-bold hover:underline">Chat</button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-gray-400">No active employees found.</div>
          )
        ) : (
          /* Normal Conversations List */
          filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={conv.id === selectedId}
                onClick={() => onSelect(conv)}
                currentUser={currentUser}
              />
            ))
          ) : (
            <div className="p-8 text-center text-sm text-gray-400">
              No conversations found. Click the "+" button to start a new chat.
            </div>
          )
        )}
      </div>
    </div>
  );
});

ChatSidebar.displayName = 'ChatSidebar';
