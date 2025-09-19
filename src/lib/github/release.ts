import type { GitHubRelease } from "./types";

function parseLinkHeader(header: string | null): Record<string, string> {
    // <https://api.github.com/repositories/17335372/releases?page=2>; rel="next", <https://api.github.com/repositories/17335372/releases?page=4>; rel="last"

    const links: Record<string, string> = {};
    if (!header) return links;

    const parts = header.split(',');
    parts.forEach(p => {
        const section = p.split(';');
        if (section.length < 2) return;
        const url = section[0].trim().replace(/<(.*)>/, '$1');
        const name = section[1].trim().replace(/rel="(.*)"/, '$1');
        links[name] = url;
    });

    return links;
}

export async function getReleaseJSON(url: string): Promise<GitHubRelease> {
    try {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json() as GitHubRelease;

        return data;

    }
    catch (err) {
        console.error('getReleaseJSON error', err);
        throw err;
    }
}

export async function getReleasesJSON(url: string): Promise<GitHubRelease[]> {
    try {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json() as GitHubRelease[];
        const links = parseLinkHeader(res.headers.get('Link'));

        if (links.next) {
            const nextData = await getReleasesJSON(links.next);

            if (Array.isArray(data) && Array.isArray(nextData)) {
                return data.concat(nextData);
            }
        }

        return data;

    } catch (err) {
        console.error('getReleasesJSON error', err);
        throw err;
    }
}

function getDownloadCount(release: GitHubRelease): number {
    let downloadCount = 0;

    for (const a of release.assets) {
        if (!a.name.includes('FilesFix') && !a.name.includes('Frontend')) downloadCount += (a.download_count || 0);
    }

    return downloadCount;
}

function getUploadTimeDiff(release: GitHubRelease): number | undefined {
    let diff: number | undefined;

    for (const a of release.assets) {
        const d = Date.now() - new Date(a.updated_at).getTime();
        if (diff === undefined || diff > d) diff = d;
    }

    return diff;
}

function getUploadTimeString(diff: number) {
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    if (diff < oneDay) {
        return `${Math.round(diff / oneHour).toString()} hours ago`;
    }
    return `${Math.round(diff / oneDay).toString()} days ago`;
}

export function getReleaseInfo(releases: GitHubRelease) {
    const diff = getUploadTimeDiff(releases);

    return {
        url: releases.html_url,
        published_at: releases.published_at,
        download_count: getDownloadCount(releases),
        upload_time: diff ? getUploadTimeString(diff) : "",
        new: diff ? diff < 30 * 24 * 60 * 60 * 1000 : false // less than 30 days
    }
}

export type ReleaseInfo = {
    url: string;
    published_at: string;
    download_count: number;
    upload_time: string
    new: boolean;
};

export function getReleasesInfo(releases: GitHubRelease[]) {
    const info: Record<string, ReleaseInfo> = {}

    for (const release of releases) {
        info[release.tag_name] = getReleaseInfo(release);
    }

    return info;
}