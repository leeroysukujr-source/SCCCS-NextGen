import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsAPI } from '../../api/groups'
import { useAuthStore } from '../../store/authStore'
import { 
  FiUsers, FiSearch, FiTrash2, FiEdit2, FiPlus, FiX, FiCheck, 
  FiClock, FiCopy, FiLink, FiCpu, FiShield, FiFilter, FiActivity,
  FiGlobe, FiLock, FiMoreVertical, FiUserPlus, FiUserMinus
} from 'react-icons/fi'
import './AdminPages.css'
import '../../pages/SecurityNexus.css' // Reuse Nexus variables and cards
import { useConfirm, useNotify } from '../../components/NotificationProvider'

export default function ManageGroups() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const notify = useNotify()
  const confirm = useConfirm()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedGroupRequests, setSelectedGroupRequests] = useState(null)
  const [linkCopied, setLinkCopied] = useState(null)

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    category: 'students',
    join_type: 'request',
    max_members: null,
    is_active: true
  })

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: groupsAPI.getGroups,
    enabled: user?.role === 'admin'
  })

  const createMutation = useMutation({
    mutationFn: groupsAPI.createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries(['groups'])
      setShowCreateModal(false)
      setNewGroup({
        name: '', description: '', category: 'students',
        join_type: 'request', max_members: null, is_active: true
      })
      notify('success', 'Neural Node Initialized')
    },
    onError: (error) => notify('error', error.response?.data?.error || 'Initialization Failed')
  })

  const updateMutation = useMutation({
    mutationFn: ({ groupId, data }) => groupsAPI.updateGroup(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['groups'])
      setShowEditModal(false)
      setSelectedGroup(null)
      notify('success', 'Protocol Updated')
    },
    onError: (error) => notify('error', error.response?.data?.error || 'Update Failed')
  })

  const deleteMutation = useMutation({
    mutationFn: groupsAPI.deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries(['groups'])
      notify('success', 'Node Deactivated')
    },
    onError: (error) => notify('error', error.response?.data?.error || 'Deactivation Failed')
  })

  const handleCreate = (e) => { e.preventDefault(); createMutation.mutate(newGroup); }
  const handleEdit = (group) => { setSelectedGroup(group); setShowEditModal(true); }
  const handleUpdate = (e) => { e.preventDefault(); updateMutation.mutate({ groupId: selectedGroup.id, data: selectedGroup }); }
  const handleDelete = async (groupId, groupName) => {
    const ok = await confirm(`Permanently sever connection to "${groupName}"? Data recovery will be impossible.`)
    if (ok) deleteMutation.mutate(groupId)
  }

  const handleViewRequests = async (group) => {
    try {
      const requests = await groupsAPI.getJoinRequests(group.id)
      setSelectedGroup(group)
      setSelectedGroupRequests(requests)
    } catch (error) { notify('error', 'Sync Failed') }
  }

  const handleApproveRequest = async (groupId, requestId) => {
    try {
      await groupsAPI.approveJoinRequest(groupId, requestId)
      const requests = await groupsAPI.getJoinRequests(groupId)
      setSelectedGroupRequests(requests)
      queryClient.invalidateQueries(['groups'])
      notify('success', 'Uplink Established')
    } catch (error) { notify('error', 'Authorization Failed') }
  }

  const handleRejectRequest = async (groupId, requestId) => {
    const ok = await confirm('Deny this node access?')
    if (!ok) return
    try {
      await groupsAPI.rejectJoinRequest(groupId, requestId)
      const requests = await groupsAPI.getJoinRequests(groupId)
      setSelectedGroupRequests(requests)
      notify('success', 'Access Request Purged')
    } catch (error) { notify('error', 'Denial Failed') }
  }

  const copyJoinLink = (group) => {
    if (group.join_code) {
      const link = `${window.location.origin}/groups/join/${group.join_code}`
      navigator.clipboard.writeText(link)
      setLinkCopied(group.id)
      setTimeout(() => setLinkCopied(null), 2000)
    }
  }

  const filteredGroups = groups.filter(group => {
    const matchesSearch = 
      group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || group.category === filterCategory
    return matchesSearch && matchesCategory
  })

  if (user?.role !== 'admin') return (
    <div className="security-nexus flex-center min-h-screen">
       <div className="nexus-card w-full max-w-lg text-center p-12 animate-modalPop">
          <FiShield size={64} className="text-red-500 mx-auto mb-6 opacity-50" />
          <h2 className="security-title text-3xl mb-4">CRITICAL ACCESS DENIED</h2>
          <p className="text-slate-400 mb-8">Unauthorized privilege detection. System administrators only.</p>
          <button className="btn btn-secondary w-full" onClick={() => window.history.back()}>Backtrack</button>
       </div>
    </div>
  )

  return (
    <div className="security-nexus min-h-screen p-8">
      <div className="max-w-[1600px] mx-auto">
        <header className="flex justify-between items-end mb-12">
          <div>
            <div className="text-blue-500 text-[10px] font-black tracking-[0.3em] uppercase mb-2">Neural Network Management</div>
            <h1 className="security-title text-5xl">Nexus Nodes</h1>
            <p className="text-slate-400 mt-2">Initialize, monitor and configure collaborative clusters across the network.</p>
          </div>
          <button className="nexus-btn-primary flex items-center gap-3 px-8 py-4 rounded-2xl" onClick={() => setShowCreateModal(true)}>
            <FiPlus /> Initialize Node
          </button>
        </header>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
           {[
             { label: 'Network Clusters', val: groups.length, icon: <FiGlobe /> },
             { label: 'Active Streams', val: groups.filter(g => g.is_active).length, icon: <FiActivity /> },
             { label: 'Synched Users', val: groups.reduce((s, g) => s + (g.member_count || 0), 0), icon: <FiUsers /> },
             { label: 'Filter Matches', val: filteredGroups.length, icon: <FiFilter /> }
           ].map((s, i) => (
             <div key={i} className="nexus-card p-6 flex items-center gap-6 border-white/5 bg-white/2 hover:border-blue-500/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-xl">{s.icon}</div>
                <div>
                   <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</div>
                   <div className="text-2xl font-bold text-white">{s.val}</div>
                </div>
             </div>
           ))}
        </div>

        {/* Filters */}
        <div className="nexus-card p-8 mb-8 border-white/5 bg-white/2 flex flex-col md:flex-row gap-6 items-center">
          <div className="relative flex-1 group w-full">
            <FiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input
              className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-16 pr-6 text-sm focus:border-blue-500 outline-none transition-all"
              placeholder="Query node by name or identifier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 p-2 bg-black/20 rounded-2xl border border-white/5">
            {['all', 'students', 'teachers', 'other'].map(cat => (
              <button
                key={cat}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterCategory === cat ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white'}`}
                onClick={() => setFilterCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Responsive Table */}
        <div className="nexus-card overflow-hidden border-white/5 bg-white/2">
          <div className="overflow-x-auto">
            <table className="nexus-table w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-8 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Node Identification</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Configuration</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Population</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="6" className="p-20 text-center"><div className="nexus-scanner mx-auto mb-4"></div><span className="text-[10px] font-black text-blue-500 tracking-widest uppercase animate-pulse">Scanning Network...</span></td></tr>
                ) : filteredGroups.length === 0 ? (
                  <tr><td colSpan="6" className="p-20 text-center space-y-4 opacity-30"><FiCpu size={48} className="mx-auto" /><h3>NODES NOT FOUND</h3></td></tr>
                ) : filteredGroups.map((group) => (
                  <tr key={group.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-lg">{group.name}</span>
                        <span className="text-xs text-slate-500 mt-1 line-clamp-1 max-w-[300px]">{group.description || 'System generated collaboration cluster.'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 rounded-lg bg-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:bg-blue-600/10 group-hover:text-blue-500 transition-all border border-white/5">
                        {group.category}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                         {group.join_type === 'direct' ? <FiGlobe className="text-green-500" /> : <FiLock className="text-amber-500" />}
                         <span className="text-xs font-bold text-slate-400 capitalize">{group.join_type}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-3">
                          <div className="flex -space-x-3">
                             {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#1e293b]"></div>)}
                          </div>
                          <span className="text-sm font-bold text-white">{group.member_count || 0}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className={`flex items-center gap-2 text-[10px] font-black tracking-widest ${group.is_active ? 'text-green-500' : 'text-slate-600'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${group.is_active ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-600'}`}></div>
                          {group.is_active ? 'OPERATIONAL' : 'OFFLINE'}
                       </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                          {group.join_type === 'request' && (
                            <button className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all" onClick={() => handleViewRequests(group)} title="Sync Requests">
                              <FiClock />
                            </button>
                          )}
                          <button className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all" onClick={() => handleEdit(group)} title="Configure">
                            <FiEdit2 />
                          </button>
                          <button className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all" onClick={() => handleDelete(group.id, group.name)} title="Deactivate">
                            <FiTrash2 />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modern Modals would go here, styled similarly to our previous upgrades */}
      {showCreateModal && (
        <GroupModal 
          title="Initialize Cluster"
          onClose={() => setShowCreateModal(false)}
          data={newGroup}
          setData={setNewGroup}
          onSubmit={handleCreate}
          isPending={createMutation.isLoading}
        />
      )}

      {showEditModal && selectedGroup && (
        <GroupModal 
          title="Cluster Reconfiguration"
          onClose={() => setShowEditModal(false)}
          data={selectedGroup}
          setData={setSelectedGroup}
          onSubmit={handleUpdate}
          isPending={updateMutation.isLoading}
          isEdit={true}
          copyLink={copyJoinLink}
          linkCopied={linkCopied}
        />
      )}

      {/* Requests Modal */}
      {selectedGroupRequests !== null && selectedGroup && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-fadeIn">
          <div className="nexus-card w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-modalPop">
             <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
                <div>
                   <h2 className="text-xl font-bold text-white">Access Requests</h2>
                   <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">{selectedGroup.name}</p>
                </div>
                <button className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-all" onClick={() => setSelectedGroupRequests(null)}>
                  <FiX />
                </button>
             </div>
             <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {selectedGroupRequests.length === 0 ? (
                  <div className="py-20 text-center opacity-30"><FiClock size={48} className="mx-auto mb-4" /><p className="font-black uppercase tracking-[0.2em]">Queue Clean</p></div>
                ) : selectedGroupRequests.map((request) => (
                  <div key={request.id} className="nexus-card p-6 bg-white/[0.02] border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center gap-6">
                       <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white">{request.user?.username?.[0]?.toUpperCase()}</div>
                       <div>
                          <div className="font-bold text-white">{request.user?.username}</div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{new Date(request.created_at).toLocaleString()}</div>
                          {request.message && <div className="mt-2 text-sm text-slate-400 italic">"{request.message}"</div>}
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <button className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all" onClick={() => handleApproveRequest(selectedGroup.id, request.id)}><FiCheck /></button>
                       <button className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all" onClick={() => handleRejectRequest(selectedGroup.id, request.id)}><FiX /></button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  )
}

function GroupModal({ title, onClose, data, setData, onSubmit, isPending, isEdit, copyLink, linkCopied }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-fadeIn" onClick={onClose}>
      <div className="nexus-card w-full max-w-xl border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-modalPop" onClick={e => e.stopPropagation()}>
        <form onSubmit={onSubmit}>
          <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
            <h2 className="text-xl font-bold text-white uppercase tracking-widest">{title}</h2>
            <button type="button" className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-all" onClick={onClose}><FiX /></button>
          </div>
          <div className="p-8 space-y-6">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Node Designation</label>
                <input required className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-3 text-white focus:border-blue-500 outline-none transition-all" value={data.name} onChange={e => setData({...data, name: e.target.value})} />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Initialization Objective</label>
                <textarea rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-3 text-white focus:border-blue-500 outline-none transition-all" value={data.description || ''} onChange={e => setData({...data, description: e.target.value})} />
             </div>
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Node Classification</label>
                   <select className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-3 text-white focus:border-blue-500 outline-none transition-all appearance-none" value={data.category} onChange={e => setData({...data, category: e.target.value})}>
                      <option value="students">Students</option>
                      <option value="teachers">Teachers</option>
                      <option value="other">Other</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Link Protocol</label>
                   <select className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-3 text-white focus:border-blue-500 outline-none transition-all appearance-none" value={data.join_type} onChange={e => setData({...data, join_type: e.target.value})}>
                      <option value="direct">Auto-Accept</option>
                      <option value="request">Manual Auth</option>
                      <option value="link">Secure Token</option>
                   </select>
                </div>
             </div>
             {isEdit && data.join_type === 'link' && data.join_code && (
                <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/20 flex items-center justify-between">
                   <div className="text-xs font-mono text-blue-400">JOIN_CODE: {data.join_code}</div>
                   <button type="button" className="text-xs font-black uppercase text-blue-300 hover:text-white" onClick={() => copyLink(data)}>
                      {linkCopied === data.id ? 'Copied' : 'Sync Link'}
                   </button>
                </div>
             )}
             <div className="flex items-center gap-3">
                <input type="checkbox" className="w-5 h-5 rounded-lg border-white/10 bg-black/40" checked={data.is_active} onChange={e => setData({...data, is_active: e.target.checked})} />
                <span className="text-xs font-bold text-slate-400">Node Online</span>
             </div>
          </div>
          <div className="p-8 border-t border-white/5 bg-black/20 flex gap-4">
            <button type="button" className="flex-1 px-8 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5" onClick={onClose}>Abort</button>
            <button type="submit" disabled={isPending} className="flex-2 px-8 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all">{isPending ? 'Processing...' : (isEdit ? 'Save Changes' : 'Initialize Node')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

