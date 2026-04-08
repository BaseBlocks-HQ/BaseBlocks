"use client";

import { Button } from "@baseblocks/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@baseblocks/ui/popover";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { Folder, Home, Menu } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { LibraryBreadcrumbTrigger } from "./library-breadcrumb-trigger";
import { LibraryFolderTree } from "./library-folder-tree";

interface FolderPathItem {
  _id: string;
  name: string;
}

interface LibraryFolder {
  _id: string;
  name: string;
  parentId?: string;
  order: number;
}

interface LibraryBrowserProps {
  containerRef?: (node: HTMLDivElement | null) => void;
  libraryName: string;
  currentLocation: string;
  folderPath: FolderPathItem[];
  folders: LibraryFolder[];
  expandedFolders: Set<string>;
  selectedFolderId: string | null;
  showFolderTree: boolean;
  showSidebar: boolean;
  onSelectFolder: (folderId: string | null) => void;
  onToggleFolder: (folderId: string) => void;
  renderTreeActions?: (folder: LibraryFolder) => ReactNode;
  sidebarFooter?: ReactNode;
  mobileMenuFooter?: ReactNode;
  children: ReactNode;
}

export function LibraryBrowser({
  containerRef,
  libraryName,
  currentLocation,
  folderPath,
  folders,
  expandedFolders,
  selectedFolderId,
  showFolderTree,
  showSidebar,
  onSelectFolder,
  onToggleFolder,
  renderTreeActions,
  sidebarFooter,
  mobileMenuFooter,
  children,
}: LibraryBrowserProps) {
  const [breadcrumbOpen, setBreadcrumbOpen] = useState(false);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);

  const breadcrumbNavContent = (
    <div className="py-1">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-muted/50"
        onClick={() => {
          onSelectFolder(null);
          setBreadcrumbOpen(false);
          setFolderMenuOpen(false);
        }}
      >
        <Home className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{libraryName}</span>
      </button>
      {folderPath.map((folder, index) => (
        <button
          key={folder._id}
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-muted/50"
          style={{ paddingLeft: `${(index + 1) * 14 + 12}px` }}
          onClick={() => {
            onSelectFolder(folder._id);
            setBreadcrumbOpen(false);
            setFolderMenuOpen(false);
          }}
        >
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{folder.name}</span>
        </button>
      ))}
    </div>
  );

  const rootButton = (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
      onClick={() => {
        onSelectFolder(null);
        setBreadcrumbOpen(false);
        setFolderMenuOpen(false);
      }}
      title={libraryName}
    >
      <Home className="h-3.5 w-3.5" />
    </Button>
  );

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl border bg-background shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <div className="flex h-100">
        {showFolderTree && showSidebar ? (
          <div className="flex w-52 shrink-0 flex-col overflow-hidden border-r bg-muted/15">
            <div className="flex items-center gap-1 px-3 pb-1 pt-2">
              {rootButton}
              <Popover open={breadcrumbOpen} onOpenChange={setBreadcrumbOpen}>
                <PopoverTrigger asChild>
                  <LibraryBreadcrumbTrigger
                    folderPath={folderPath}
                    currentLocation={currentLocation}
                  />
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="start"
                  className="w-56 p-1"
                >
                  {breadcrumbNavContent}
                </PopoverContent>
              </Popover>
            </div>

            <ScrollArea className="flex-1">
              <div className="px-2 pb-2">
                {folders.length > 0 ? (
                  <LibraryFolderTree
                    folders={folders}
                    expandedFolders={expandedFolders}
                    selectedFolderId={selectedFolderId}
                    onSelectFolder={onSelectFolder}
                    onToggleFolder={onToggleFolder}
                    renderActions={renderTreeActions}
                  />
                ) : (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    No folders
                  </p>
                )}
              </div>
            </ScrollArea>

            {sidebarFooter ? (
              <div className="p-2 pt-1">{sidebarFooter}</div>
            ) : null}
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {!showSidebar ? (
            <div className="flex items-center gap-1 px-3 pb-1 pt-2">
              {showFolderTree ? (
                <>
                  <Popover
                    open={folderMenuOpen}
                    onOpenChange={setFolderMenuOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                      >
                        <Menu className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="bottom"
                      align="start"
                      className="w-64 p-0"
                    >
                      <div className="flex max-h-80 flex-col overflow-hidden">
                        <div className="p-1">{breadcrumbNavContent}</div>
                        <ScrollArea className="flex-1">
                          <div className="px-2 pb-2">
                            {folders.length > 0 ? (
                              <LibraryFolderTree
                                folders={folders}
                                expandedFolders={expandedFolders}
                                selectedFolderId={selectedFolderId}
                                onSelectFolder={(folderId) => {
                                  onSelectFolder(folderId);
                                  setFolderMenuOpen(false);
                                }}
                                onToggleFolder={onToggleFolder}
                                renderActions={renderTreeActions}
                              />
                            ) : (
                              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                                No folders
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                        {mobileMenuFooter ? (
                          <div className="p-2 pt-1">{mobileMenuFooter}</div>
                        ) : null}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {rootButton}

                  <Popover
                    open={breadcrumbOpen}
                    onOpenChange={setBreadcrumbOpen}
                  >
                    <PopoverTrigger asChild>
                      <LibraryBreadcrumbTrigger
                        folderPath={folderPath}
                        currentLocation={currentLocation}
                      />
                    </PopoverTrigger>
                    <PopoverContent
                      side="bottom"
                      align="start"
                      className="w-56 p-1"
                    >
                      {breadcrumbNavContent}
                    </PopoverContent>
                  </Popover>
                </>
              ) : (
                <div className="min-w-0 flex-1">
                  <LibraryBreadcrumbTrigger
                    folderPath={folderPath}
                    currentLocation={currentLocation}
                  />
                </div>
              )}
            </div>
          ) : null}

          {children}
        </div>
      </div>
    </div>
  );
}
