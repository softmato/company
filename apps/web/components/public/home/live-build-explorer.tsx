'use client';

import { Atom, Braces, Hash } from 'lucide-react';
import { useState, type ComponentProps } from 'react';

import {
  FileItem,
  Files,
  FolderContent,
  FolderItem,
  FolderTrigger,
  SubFiles,
} from '@/components/animate-ui/components/radix/files';
import { cn } from '@/lib/cn';
import { TREE, type TreeNode } from '@/lib/home/live-build-code';
import type { GitStatus } from '@/lib/home/live-build-timeline';

type IconProps = ComponentProps<'svg'>;

const TsxIcon = ({ className }: IconProps) => (
  <Atom aria-hidden className={cn(className, 'text-sky-400')} />
);
const JsonIcon = ({ className }: IconProps) => (
  <Braces aria-hidden className={cn(className, 'text-amber-300')} />
);
const CssIcon = ({ className }: IconProps) => (
  <Hash aria-hidden className={cn(className, 'text-violet-300')} />
);
const TsIcon = ({ className }: IconProps) => (
  <span
    aria-hidden
    className={cn(
      className,
      'grid place-items-center rounded-[3px] bg-sky-600 font-sans text-[7px] font-black leading-none text-white',
    )}
  >
    TS
  </span>
);

/** The file-type marks an editor shows: React for .tsx, TS, braces for JSON, # for CSS. */
export const glyphFor = (name: string) =>
  name.endsWith('.tsx')
    ? TsxIcon
    : name.endsWith('.json')
      ? JsonIcon
      : name.endsWith('.css')
        ? CssIcon
        : TsIcon;

/** A folder's mark: new if anything in it is new, else changed. */
function folderStatus(node: TreeNode, status: Map<string, GitStatus>) {
  const marks = (n: TreeNode): (GitStatus | undefined)[] =>
    n.children ? n.children.flatMap(marks) : [status.get(n.path)];
  const all = marks(node);
  if (all.includes('untracked')) return 'untracked';
  if (all.includes('modified')) return 'modified';
  return undefined;
}

/**
 * The editor's file tree (animate-ui's Files): the café project, its folders
 * opening as the developer reaches them, each file marked U or M once the
 * build has written it. The visitor can fold folders and open any file.
 */
export function LiveBuildExplorer({
  open,
  active,
  status,
  onOpen,
}: {
  /** The folders the build wants open; the visitor's folding lasts until it changes. */
  open: string[];
  active?: string | undefined;
  status: Map<string, GitStatus>;
  onOpen: (path: string) => void;
}) {
  const [folders, setFolders] = useState(open);
  const [wanted, setWanted] = useState(open.join());
  if (wanted !== open.join()) {
    setWanted(open.join());
    setFolders(open);
  }

  const tree = (nodes: TreeNode[]) =>
    nodes.map((node) =>
      node.children ? (
        <FolderItem key={node.path} value={node.path}>
          <FolderTrigger gitStatus={folderStatus(node, status)}>
            {node.name}
          </FolderTrigger>
          <FolderContent>
            <SubFiles open={folders} onOpenChange={setFolders}>
              {tree(node.children)}
            </SubFiles>
          </FolderContent>
        </FolderItem>
      ) : (
        <button
          key={node.path}
          type="button"
          onClick={() => onOpen(node.path)}
          aria-current={node.path === active ? 'page' : undefined}
          className={cn(
            'block w-full cursor-pointer rounded-md text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400',
            node.path === active
              ? 'bg-emerald-400/[0.12] text-white'
              : 'text-white/60',
          )}
        >
          <FileItem icon={glyphFor(node.name)} gitStatus={status.get(node.path)}>
            {node.name}
          </FileItem>
        </button>
      ),
    );

  return (
    <Files
      open={folders}
      onOpenChange={setFolders}
      className="editor-scroll min-h-0 flex-1 px-1.5 pb-3 pt-0 text-white/60 [&_[data-slot=file-icon]>*]:size-3.5 [&_[data-slot=file-label]]:text-[12.5px] [&_[data-slot=file]]:px-2 [&_[data-slot=file]]:py-[5px] [&_[data-slot=folder-icon]>svg]:size-4 [&_[data-slot=folder]]:px-2 [&_[data-slot=folder]]:py-[5px]"
    >
      {tree(TREE)}
    </Files>
  );
}
