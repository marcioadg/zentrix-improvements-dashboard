import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  History, 
  Plus, 
  Search, 
  X, 
  Folder, 
  MoreVertical,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit2,
  MessageSquare,
  PanelRightClose,
  FolderPlus
} from 'lucide-react';
import { ChatSession, ChatFolder, loadChatSessions, loadFolders, createFolder, deleteFolder, deleteChatSession, moveSessionToFolder } from '@/services/aiChatHistoryService';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentSessionId?: string;
  onLoadSession: (session: ChatSession) => void;
  onNewChat: () => void;
  companyId: string;
  onRefreshReady?: (refreshFn: () => void) => void;
}

// Sidebar chat-folder feature flag. The data layer (chat_folders table,
// load/create/delete/move helpers) stays wired up so any existing foldered
// chats keep showing under "All Chats"; only the UI is hidden. Flip to true
// to bring the folders + "New folder" button back.
const FOLDERS_ENABLED = false;

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  isOpen,
  onToggle,
  currentSessionId,
  onLoadSession,
  onNewChat,
  companyId,
  onRefreshReady
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['all']));
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  // Tracks whether the initial fetch is still in flight, so we can show
  // skeleton rows instead of the "no conversations yet" empty state
  // before the data has had a chance to load.
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { toast } = useToast();

  // Load data when sidebar opens or company changes. Skips while the
  // company id hasn't resolved yet — otherwise we'd briefly fetch every
  // session across companies before filtering.
  useEffect(() => {
    if (isOpen && companyId) {
      loadData();
    }
  }, [isOpen, companyId]);

  // Refresh when a new session is created (currentSessionId changes)
  useEffect(() => {
    if (currentSessionId && isOpen) {
      logger.log('🔄 New session detected, refreshing sidebar:', currentSessionId);
      loadData();
    }
  }, [currentSessionId, isOpen]);

  // Periodic refresh so unread badges on OTHER sessions (e.g. a
  // scheduled task lands on thread A while user is on thread B) appear
  // without manual refresh. Cheap: one query per minute, only while
  // the sidebar is open and the tab is visible.
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      if (document.hidden) return;
      loadData();
    }, 60_000);
    const onVisible = () => {
      if (!document.hidden) loadData();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isOpen, companyId]);

  const loadData = async () => {
    try {
      logger.log('📂 Loading chat history for company:', companyId);
      const [loadedSessions, loadedFolders] = await Promise.all([
        loadChatSessions(companyId),
        loadFolders(companyId)
      ]);
      logger.log('✅ Loaded chat sessions:', loadedSessions.length);
      logger.log('✅ Loaded folders:', loadedFolders.length);
      logger.log('📊 Sessions state before update:', sessions.length);
      setSessions(loadedSessions);
      setFolders(loadedFolders);
      logger.log('📊 Sessions state after update:', loadedSessions.length);
    } catch (error) {
      logger.error('❌ Error loading chat history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chat history',
        variant: 'destructive'
      });
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Expose refresh function to parent
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(loadData);
    }
  }, [onRefreshReady]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const folder = await createFolder(newFolderName, companyId);
    if (folder) {
      setFolders([...folders, folder]);
      setNewFolderName('');
      setIsCreatingFolder(false);
      toast({
        title: 'Folder created',
        description: `"${folder.name}" folder created successfully`
      });
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    const success = await deleteFolder(folderId);
    if (success) {
      setFolders(folders.filter(f => f.id !== folderId));
      loadData(); // Refresh sessions to update folder_id
      toast({
        title: 'Folder deleted',
        description: 'Folder and its contents moved to "All Chats"'
      });
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const success = await deleteChatSession(sessionId);
    if (success) {
      setSessions(sessions.filter(s => s.id !== sessionId));
      toast({
        title: 'Chat deleted',
        description: 'Chat session deleted successfully'
      });
    }
  };

  const handleMoveSession = async (sessionId: string, folderId: string | null) => {
    const success = await moveSessionToFolder(sessionId, folderId);
    if (success) {
      loadData();
      toast({
        title: 'Chat moved',
        description: 'Chat moved to folder successfully'
      });
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSessionsByFolder = (folderId: string | null) => {
    return filteredSessions.filter(s => s.folder_id === folderId);
  };

  // When folders are hidden, surface every session under "All Chats" so
  // any chat that had previously been filed into a folder still shows up.
  const allChats = FOLDERS_ENABLED ? getSessionsByFolder(null) : filteredSessions;
  const visibleFolders = FOLDERS_ENABLED ? folders : [];

  // Hide via CSS instead of unmounting so the sessions list stays in
  // memory across collapse/expand. Otherwise the component remounts
  // empty on every reopen and the list flickers while it re-fetches.
  return (
    <div className={`w-80 border-l border-border bg-background flex flex-col h-full ${isOpen ? '' : 'hidden'}`}>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-2 flex-shrink-0">
        <History className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">Chat History</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="ml-auto h-8 w-8"
          aria-label="Close chat history"
        >
          <PanelRightClose className="w-4 h-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* All Chats */}
          <div>
            <button
              onClick={() => toggleFolder('all')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
            >
              {expandedFolders.has('all') ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">All Chats</span>
              <span className="ml-auto text-xs text-muted-foreground">{allChats.length}</span>
            </button>

            {expandedFolders.has('all') && (
              <div className="ml-4 mt-1 space-y-0.5">
                {isInitialLoading ? (
                  <SessionListSkeleton />
                ) : allChats.length > 0 ? (
                  allChats.map(session => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={session.id === currentSessionId}
                      onLoad={() => onLoadSession(session)}
                      onDelete={() => handleDeleteSession(session.id)}
                      onMove={(folderId) => handleMoveSession(session.id, folderId)}
                      folders={visibleFolders}
                    />
                  ))
                ) : (
                  <div className="px-2 py-4 text-center">
                    <p className="text-xs text-muted-foreground">No conversations yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Start a new chat to begin</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Custom Folders */}
          {visibleFolders.map(folder => {
            const folderSessions = getSessionsByFolder(folder.id);
            return (
              <div key={folder.id}>
                <div className="flex items-center gap-1 group">
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    {expandedFolders.has(folder.id) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Folder className="w-4 h-4" style={{ color: folder.color }} />
                    <span className="text-sm font-medium text-foreground">{folder.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{folderSessions.length}</span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDeleteFolder(folder.id)} className="text-destructive">
                        <Trash2 className="w-3 h-3 mr-2" />
                        Delete folder
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {expandedFolders.has(folder.id) && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {folderSessions.map(session => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        isActive={session.id === currentSessionId}
                        onLoad={() => onLoadSession(session)}
                        onDelete={() => handleDeleteSession(session.id)}
                        onMove={(folderId) => handleMoveSession(session.id, folderId)}
                        folders={visibleFolders}
                      />
                    ))}
                    {folderSessions.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-2">No conversations</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Create Folder */}
          {FOLDERS_ENABLED && (
          <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
            <DialogTrigger asChild>
              <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
                <FolderPlus className="w-4 h-4" />
                <span>New folder</span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreatingFolder(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateFolder}>Create</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Session Item Component
const SessionItem: React.FC<{
  session: ChatSession;
  isActive: boolean;
  onLoad: () => void;
  onDelete: () => void;
  onMove: (folderId: string | null) => void;
  folders: ChatFolder[];
}> = ({ session, isActive, onLoad, onDelete, onMove, folders }) => {
  return (
    <div
      className={`group flex items-start gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors ${
        isActive ? 'bg-primary/10' : 'hover:bg-muted/50'
      }`}
      onClick={onLoad}
    >
      <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${session.has_unread && !isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
          {session.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
        </p>
      </div>
      {session.has_unread && !isActive && (
        <span
          className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0"
          aria-label="Unread messages"
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {folders.map(folder => (
            <DropdownMenuItem key={folder.id} onClick={(e) => { e.stopPropagation(); onMove(folder.id); }}>
              <Folder className="w-3 h-3 mr-2" style={{ color: folder.color }} />
              Move to {folder.name}
            </DropdownMenuItem>
          ))}
          {session.folder_id && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove(null); }}>
              <MessageSquare className="w-3 h-3 mr-2" />
              Move to All Chats
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
            <Trash2 className="w-3 h-3 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// Placeholder rows shown while the first fetch is in flight, so the
// user sees the sidebar shape immediately instead of a flicker between
// the empty state and the populated list.
const SessionListSkeleton: React.FC = () => (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-start gap-2 px-2 py-2">
        <Skeleton className="w-3 h-3 mt-0.5 rounded-sm flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      </div>
    ))}
  </>
);
