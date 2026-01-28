import { useState, useEffect } from 'react';
import { useTruck } from '../context/TruckContext';
import { socialAPI } from '../services/api';
import { Share2, Plus, Edit2, Trash2, X, Send, Calendar, Instagram, Facebook, Twitter, FileText, Zap, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import SocialTemplateEditor from '../components/SocialTemplateEditor';
import AutoPostRules from '../components/AutoPostRules';

const platforms = ['FACEBOOK', 'INSTAGRAM', 'TWITTER', 'TIKTOK'];
const postTypes = ['LOCATION_ANNOUNCEMENT', 'DAILY_MENU', 'SPECIAL_PROMOTION', 'PHOTO_SHARE', 'CUSTOMER_ENGAGEMENT', 'EVENT_ANNOUNCEMENT'];

export default function Social() {
  const { selectedTruck } = useTruck();
  const [posts, setPosts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [showPostModal, setShowPostModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [postForm, setPostForm] = useState({ platform: 'INSTAGRAM', content: '', type: 'CUSTOMER_ENGAGEMENT', scheduledFor: '' });

  useEffect(() => {
    if (selectedTruck) loadData();
  }, [selectedTruck]);

  const loadData = async () => {
    try {
      const [postsRes, analyticsRes, accountsRes] = await Promise.all([
        socialAPI.getByTruck(selectedTruck.id),
        socialAPI.getAnalytics(selectedTruck.id),
        socialAPI.getAccounts(selectedTruck.id)
      ]);
      setPosts(postsRes.data);
      setAnalytics(analyticsRes.data);
      setAccounts(accountsRes.data);
    } catch (error) {
      console.error('Failed to load social data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAccount = async (platform) => {
    // In production, this would initiate OAuth flow
    try {
      await socialAPI.connectAccount(platform, {
        truckId: selectedTruck.id,
        accountId: `${platform.toLowerCase()}_${Date.now()}`,
        accountName: `${selectedTruck.name} on ${platform}`,
        accessToken: `mock_token_${Date.now()}`
      });
      toast.success(`Connected to ${platform}`);
      loadData();
      setShowConnectModal(false);
    } catch (error) {
      toast.error(`Failed to connect to ${platform}`);
    }
  };

  const handleDisconnectAccount = async (accountId) => {
    if (!confirm('Disconnect this account?')) return;
    try {
      await socialAPI.disconnectAccount(accountId);
      toast.success('Account disconnected');
      loadData();
    } catch (error) {
      toast.error('Failed to disconnect account');
    }
  };

  const handleSavePost = async (e) => {
    e.preventDefault();
    try {
      if (editingPost) {
        await socialAPI.update(editingPost.id, postForm);
        toast.success('Post updated');
      } else {
        await socialAPI.create({ ...postForm, truckId: selectedTruck.id });
        toast.success('Post created');
      }
      setShowPostModal(false);
      setEditingPost(null);
      loadData();
    } catch (error) {
      toast.error('Failed to save post');
    }
  };

  const handlePublish = async (post) => {
    try {
      await socialAPI.publish(post.id);
      toast.success('Post published');
      loadData();
    } catch (error) {
      toast.error('Failed to publish post');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this post?')) return;
    try {
      await socialAPI.delete(id);
      toast.success('Post deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const openEditPost = (post) => {
    setEditingPost(post);
    setPostForm({
      platform: post.platform,
      content: post.content,
      type: post.type,
      scheduledFor: post.scheduledFor ? format(new Date(post.scheduledFor), "yyyy-MM-dd'T'HH:mm") : ''
    });
    setShowPostModal(true);
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'INSTAGRAM': return <Instagram className="h-5 w-5 text-pink-600" />;
      case 'FACEBOOK': return <Facebook className="h-5 w-5 text-blue-600" />;
      case 'TWITTER': return <Twitter className="h-5 w-5 text-sky-500" />;
      default: return <Share2 className="h-5 w-5" />;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Social Media</h1>
        <button onClick={() => { setEditingPost(null); setPostForm({ platform: 'INSTAGRAM', content: '', type: 'CUSTOMER_ENGAGEMENT', scheduledFor: '' }); setShowPostModal(true); }} className="btn btn-primary">
          <Plus className="h-4 w-4 mr-2" />Create Post
        </button>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4"><p className="text-sm text-gray-500">Total Posts</p><p className="text-2xl font-bold">{analytics.totalPosts}</p></div>
          <div className="card p-4"><p className="text-sm text-gray-500">Total Likes</p><p className="text-2xl font-bold text-pink-600">{analytics.totalLikes}</p></div>
          <div className="card p-4"><p className="text-sm text-gray-500">Total Comments</p><p className="text-2xl font-bold text-blue-600">{analytics.totalComments}</p></div>
          <div className="card p-4"><p className="text-sm text-gray-500">Total Reach</p><p className="text-2xl font-bold text-green-600">{analytics.totalReach.toLocaleString()}</p></div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'posts', label: 'Posts', icon: Share2 },
          { id: 'scheduled', label: 'Scheduled', icon: Calendar },
          { id: 'templates', label: 'Templates', icon: FileText },
          { id: 'automation', label: 'Automation', icon: Zap },
          { id: 'accounts', label: 'Accounts', icon: Link2 },
          { id: 'analytics', label: 'Analytics', icon: Share2 }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {activeTab === 'posts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map(post => (
            <div key={post.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getPlatformIcon(post.platform)}
                  <span className="text-sm font-medium">{post.platform}</span>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  post.status === 'POSTED' ? 'bg-green-100 text-green-700' :
                  post.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                  post.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'
                }`}>{post.status}</span>
              </div>
              <p className="text-sm text-gray-700 mb-3 line-clamp-3">{post.content}</p>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>{post.type.replace(/_/g, ' ')}</span>
                {post.postedAt && <span>{format(new Date(post.postedAt), 'MMM d, h:mm a')}</span>}
              </div>
              {post.status === 'POSTED' && (
                <div className="flex gap-4 text-xs text-gray-500 border-t pt-3">
                  <span>{post.likes} likes</span>
                  <span>{post.comments} comments</span>
                  <span>{post.shares} shares</span>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                {post.status === 'DRAFT' && (
                  <button onClick={() => handlePublish(post)} className="btn btn-primary flex-1 text-sm"><Send className="h-4 w-4 mr-1" />Publish</button>
                )}
                <button onClick={() => openEditPost(post)} className="btn btn-secondary text-sm"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(post.id)} className="btn btn-danger text-sm"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {posts.length === 0 && (
            <div className="col-span-full text-center py-12"><Share2 className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No posts yet</p></div>
          )}
        </div>
      )}

      {/* Scheduled */}
      {activeTab === 'scheduled' && (
        <div className="space-y-4">
          {posts.filter(p => p.status === 'SCHEDULED').map(post => (
            <div key={post.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getPlatformIcon(post.platform)}
                <div>
                  <p className="font-medium line-clamp-1">{post.content.substring(0, 50)}...</p>
                  <p className="text-sm text-gray-500">Scheduled: {format(new Date(post.scheduledFor), 'MMM d, yyyy h:mm a')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handlePublish(post)} className="btn btn-primary text-sm">Publish Now</button>
                <button onClick={() => openEditPost(post)} className="btn btn-secondary text-sm"><Edit2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {posts.filter(p => p.status === 'SCHEDULED').length === 0 && (
            <div className="card p-8 text-center text-gray-500"><Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" /><p>No scheduled posts</p></div>
          )}
        </div>
      )}

      {/* Templates */}
      {activeTab === 'templates' && (
        <SocialTemplateEditor />
      )}

      {/* Automation */}
      {activeTab === 'automation' && (
        <AutoPostRules />
      )}

      {/* Accounts */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Connected Accounts</h2>
              <p className="text-sm text-gray-500">Manage your social media connections</p>
            </div>
            <button onClick={() => setShowConnectModal(true)} className="btn btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Connect Account
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map(account => (
              <div key={account.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(account.platform)}
                    <div>
                      <h3 className="font-medium">{account.platform}</h3>
                      <p className="text-sm text-gray-500">{account.accountName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${account.isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {account.isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                    <button
                      onClick={() => handleDisconnectAccount(account.id)}
                      className="btn btn-secondary text-sm"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {accounts.length === 0 && (
              <div className="col-span-2 card p-8 text-center">
                <Link2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No accounts connected yet</p>
                <button onClick={() => setShowConnectModal(true)} className="btn btn-primary">
                  Connect Your First Account
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics */}
      {activeTab === 'analytics' && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="font-semibold mb-4">By Platform</h3>
            <div className="space-y-3">
              {Object.entries(analytics.byPlatform || {}).map(([platform, data]) => (
                <div key={platform} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">{getPlatformIcon(platform)}<span className="font-medium">{platform}</span></div>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>{data.posts} posts</span>
                    <span>{data.likes} likes</span>
                    <span>{data.reach} reach</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold mb-4">By Post Type</h3>
            <div className="space-y-3">
              {Object.entries(analytics.byType || {}).map(([type, data]) => (
                <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{type.replace(/_/g, ' ')}</span>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>{data.posts} posts</span>
                    <span>{data.likes} likes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Connect Account Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Connect Social Account</h2>
              <button onClick={() => setShowConnectModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              {platforms.map(platform => {
                const isConnected = accounts.some(a => a.platform === platform && a.isConnected);
                return (
                  <button
                    key={platform}
                    onClick={() => !isConnected && handleConnectAccount(platform)}
                    disabled={isConnected}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border ${
                      isConnected
                        ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {getPlatformIcon(platform)}
                      <span className="font-medium">{platform}</span>
                    </div>
                    {isConnected ? (
                      <span className="text-sm text-green-600">Connected</span>
                    ) : (
                      <span className="text-sm text-primary-600">Connect</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-semibold">{editingPost ? 'Edit Post' : 'Create Post'}</h2><button onClick={() => setShowPostModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleSavePost} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Platform</label><select value={postForm.platform} onChange={e => setPostForm({ ...postForm, platform: e.target.value })} className="input">{platforms.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                <div><label className="label">Type</label><select value={postForm.type} onChange={e => setPostForm({ ...postForm, type: e.target.value })} className="input">{postTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select></div>
              </div>
              <div><label className="label">Content</label><textarea value={postForm.content} onChange={e => setPostForm({ ...postForm, content: e.target.value })} className="input" rows={4} required /></div>
              <div><label className="label">Schedule For (optional)</label><input type="datetime-local" value={postForm.scheduledFor} onChange={e => setPostForm({ ...postForm, scheduledFor: e.target.value })} className="input" /></div>
              <div className="flex gap-3"><button type="button" onClick={() => setShowPostModal(false)} className="btn btn-secondary flex-1">Cancel</button><button type="submit" className="btn btn-primary flex-1">{editingPost ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
