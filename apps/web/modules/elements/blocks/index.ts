/**
 * Block elements — import this file to register all blocks with the registry.
 *
 * Simple blocks are self-contained single files.
 * Complex blocks (banner, directory, flowchart, decision-tree) keep their own directories.
 */

// Simple blocks (self-registering single files)
import "./heading";
import "./paragraph";
import "./callout";
import "./code";
import "./divider";
import "./spacer";

// Rich content blocks (separate files for heavy dependencies)
import "./richtext";
import "./subpage";

// Complex blocks (own directories)
import "./banner";
import "./directory";
import "./flowchart";
import "./decision-tree";
