'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Comment {
  id: string;
  profile_id: string;
  author_profile_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author: {
    name: string;
    image_url: string;
    city: string;
  };
  profile: {
    name: string;
  };
}

interface UserStrikes {
  [key: string]: number;
}

export default function AdminCommentsView() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userStrikes, setUserStrikes] = useState<UserStrikes>({});
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [strikeReason, setStrikeReason] = useState('');
  const [issuingStrike, setIssuingStrike] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const getToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setToken(session.access_token);
      }
    };
    getToken();
    loadComments();
  }, []);

  const loadComments = async () => {
    try {
      setLoading(true);

      // Fetch all comments with author info
      const { data: commentData, error: commentError } = await supabase
        .from('profile_comments')
        .select(`
          id,
          profile_id,
          author_profile_id,
          content,
          created_at,
          updated_at,
          author:profiles!profile_comments_author_profile_id_fkey(
            name,
            image_url,
            city
          ),
          profile:profiles!profile_comments_profile_id_fkey(
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (commentError) throw commentError;

      setComments(commentData as any);

      // Fetch strike counts for each author
      const { data: strikesData, error: strikesError } = await supabase
        .from('user_strikes')
        .select('user_profile_id');

      if (strikesError) throw strikesError;

      const strikesCounts: UserStrikes = {};
      strikesData?.forEach((strike) => {
        strikesCounts[strike.user_profile_id] =
          (strikesCounts[strike.user_profile_id] || 0) + 1;
      });

      setUserStrikes(strikesCounts);
    } catch (error) {
      console.error('Error loading comments:', error);
      setNotification('Nie udało się załadować komentarzy');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Na pewno usunąć ten komentarz?')) return;
    if (!token) {
      setNotification('Błąd autoryzacji - spróbuj zalogować się ponownie');
      return;
    }

    try {
      const response = await fetch('/api/admin/comments/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ commentId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setNotification('Komentarz usunięty');
      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      setNotification('Nie udało się usunąć komentarza - spróbuj ponownie');
    }
  };

  const handleIssueStrike = async (commentId: string, authorId: string) => {
    if (!strikeReason.trim()) {
      setNotification('Podaj powód udzielenia strikea');
      return;
    }
    if (!token) {
      setNotification('Błąd autoryzacji - spróbuj zalogować się ponownie');
      return;
    }

    try {
      setIssuingStrike(true);

      const response = await fetch('/api/admin/strikes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userProfileId: authorId,
          reason: strikeReason,
          commentId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      const data = await response.json();
      setNotification(data.message);

      // Update strikes count
      setUserStrikes({
        ...userStrikes,
        [authorId]: data.strikeCount
      });

      setStrikeReason('');
      setSelectedComment(null);

      if (data.isBanned) {
        // Auto-delete recent comments from this user
        setComments(comments.filter(c => c.author_profile_id !== authorId));
      }

      await loadComments();
    } catch (error) {
      console.error('Error issuing strike:', error);
      setNotification('Nie udało się udzielić strikea - spróbuj ponownie');
    } finally {
      setIssuingStrike(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Ładowanie komentarzy...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-slate-800 text-white px-12 py-6 rounded-[2.5rem] shadow-2xl flex items-center gap-5 animate-in fade-in zoom-in duration-300 font-bold border-4 border-slate-700">
          <span className="text-xl">{notification}</span>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-6">📋 Panel Moderacji Komentarzy</h1>

      {comments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Brak komentarzy do moderacji
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const strikes = userStrikes[comment.author_profile_id] || 0;
            const isBanned = strikes >= 3;

            return (
              <div
                key={comment.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-gray-50"
              >
                {/* Header: Author info + strikes */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {comment.author.image_url && (
                      <img
                        src={comment.author.image_url}
                        alt={comment.author.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className="font-semibold">{comment.author.name}</p>
                      <p className="text-sm text-gray-600">
                        {comment.author.city} • Pod profilem: {comment.profile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleString('pl-PL')}
                      </p>
                    </div>
                  </div>

                  {/* Strike counter + ban indicator */}
                  <div className="text-right">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-bold ${
                        isBanned
                          ? 'bg-red-100 text-red-700'
                          : strikes > 0
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {isBanned ? '🚫 ZBANOWANY' : `⚠️ ${strikes}/3 Strikea`}
                    </div>
                  </div>
                </div>

                {/* Comment preview */}
                <div className="bg-gray-100 p-3 rounded text-sm">
                  <p className="line-clamp-2">{comment.content}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {comment.content.length} znaków
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {selectedComment === comment.id ? (
                    // Strike reason input
                    <div className="w-full space-y-2">
                      <textarea
                        value={strikeReason}
                        onChange={(e) => setStrikeReason(e.target.value)}
                        placeholder="Wpisz powód udzielenia strikea (np. Spam, Obraźliwy język)"
                        className="w-full p-2 border rounded text-sm resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleIssueStrike(comment.id, comment.author_profile_id)
                          }
                          disabled={issuingStrike || !strikeReason.trim()}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                        >
                          {issuingStrike ? 'Wysyłanie...' : 'Potwierdź Strike'}
                        </button>
                        <button
                          onClick={() => setSelectedComment(null)}
                          className="px-3 py-1 bg-gray-300 text-gray-800 rounded text-sm hover:bg-gray-400"
                        >
                          Anuluj
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!isBanned && (
                        <button
                          onClick={() => setSelectedComment(comment.id)}
                          className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                        >
                          ⚠️ Daj Strike
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        🗑️ Usuń
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
