import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProcessEditor from './ProcessEditor';

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: { sanitize: (html: string) => html },
}));

// Mock hooks
vi.mock('@/hooks/wiki/useWikiPages', () => ({
  useWikiPages: vi.fn(() => ({
    pages: [
      {
        id: 'page1',
        title: 'Test Page',
        content: '<p>Hello</p>',
        content_blocks: ['<p>Hello</p>'],
        space_id: null,
        parent_page_id: null,
        created_by: 'user1',
        permissions: null,
      },
    ],
    updatePage: vi.fn(),
    isPageShared: vi.fn(() => false),
  })),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: vi.fn(() => ({
    profile: { id: 'user1', full_name: 'Test User' },
  })),
}));

vi.mock('@/hooks/wiki/useProcessCompletion', () => ({
  useProcessCompletion: vi.fn(() => ({
    completedPageIds: [],
    markComplete: vi.fn(),
    unmarkComplete: vi.fn(),
    isMarking: false,
    isUnmarking: false,
  })),
}));

vi.mock('@/hooks/useDebouncedCallback', () => ({
  useDebouncedCallback: vi.fn(() => [vi.fn(), vi.fn()]),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock sub-components
vi.mock('./ProcessNavigationBar', () => ({
  default: (props: any) => <div data-testid="process-nav-bar">NavigationBar</div>,
}));

vi.mock('./ProcessEditorToolbar', () => ({
  default: (props: any) => <div data-testid="process-editor-toolbar">Toolbar</div>,
}));

vi.mock('./ProcessPermissionsModal', () => ({
  default: (props: any) => <div data-testid="process-permissions-modal">PermissionsModal</div>,
}));

vi.mock('./ProcessEditorSettingsDropdown', () => ({
  default: (props: any) => <div data-testid="process-editor-settings">Settings</div>,
}));

// Mock editor formatting utils
vi.mock('./editorFormattingUtils', () => ({
  toggleBold: vi.fn(),
  toggleItalic: vi.fn(),
  toggleUnderline: vi.fn(),
  toggleStrikethrough: vi.fn(),
  toggleCode: vi.fn(),
  toggleBlockquote: vi.fn(),
  insertList: vi.fn(),
  setFormatBlock: vi.fn(),
  insertLink: vi.fn(),
  isTagActive: vi.fn(() => false),
  getActiveBlockType: vi.fn(() => 'paragraph'),
}));

describe('ProcessEditor', () => {
  const defaultProps = {
    pageId: 'page1',
    onBack: vi.fn(),
    allPageIds: ['page1'],
    onNavigateTo: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ProcessEditor {...defaultProps} />);
    expect(screen.getByLabelText('Page title')).toBeInTheDocument();
  });

  it('shows back button', () => {
    render(<ProcessEditor {...defaultProps} />);
    const backButton = screen.getByRole('button', { name: /back/i });
    expect(backButton).toBeInTheDocument();
  });

  it('renders page title', () => {
    render(<ProcessEditor {...defaultProps} />);
    const titleInput = screen.getByLabelText('Page title');
    expect(titleInput).toHaveValue('Test Page');
  });

  it('shows editor area (contentEditable div)', () => {
    render(<ProcessEditor {...defaultProps} />);
    const editor = screen.getByLabelText('Page content');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveAttribute('contenteditable', 'true');
  });
});
