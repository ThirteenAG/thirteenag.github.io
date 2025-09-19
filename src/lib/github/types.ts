/**
 * Type definitions for GitHub Releases JSON
 */

export interface GitHubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string | null;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  user_view_type: string;
  site_admin: boolean;
}

export interface ReleaseAsset {
  url: string;
  id: number;
  node_id: string;
  name: string;
  label: string;
  uploader: GitHubUser;
  content_type: string;
  state: string;
  size: number;
  digest: string | null;
  download_count: number;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  browser_download_url: string;
}

export interface ReleaseReactions {
  url: string;
  total_count: number;
  '+1': number;
  '-1': number;
  laugh: number;
  hooray: number;
  confused: number;
  heart: number;
  rocket: number;
  eyes: number;
}

export interface GitHubRelease {
  url: string;
  assets_url: string;
  upload_url: string;
  html_url: string;
  id: number;
  author: GitHubUser;
  node_id: string;
  tag_name: string;
  target_commitish: string;
  name: string;
  draft: boolean;
  immutable: boolean;
  prerelease: boolean;
  created_at: string; // ISO date
  updated_at: string; // ISO date
  published_at: string; // ISO date
  assets: ReleaseAsset[];
  tarball_url: string;
  zipball_url: string;
  body: string;
  reactions: ReleaseReactions;
}