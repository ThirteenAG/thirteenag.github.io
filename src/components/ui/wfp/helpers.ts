import { getReleaseInfo, getReleaseJSON, getReleasesInfo, getReleasesJSON, type ReleaseInfo } from "@/lib/github/release";

function getUrlFromTag(tag: string) {
    switch (tag) {
        case "gtaivfusionfix":
            return "https://api.github.com/repos/ThirteenAG/GTAIV.EFLC.FusionFix/releases/latest";
        case "mp3fusionfix":
            return "https://api.github.com/repos/ThirteenAG/MaxPayne3.FusionFix/releases/latest";
        case "alienisolation":
            return "https://api.github.com/repos/ThirteenAG/AlienIsolation.SkipSaveConfirmationDialog/releases/latest";
        default:
            return "https://api.github.com/repos/ThirteenAG/WidescreenFixesPack/releases?per_page=100";
    }
}

async function getReleasesStats(url: string) {
    const data = await getReleasesJSON(url);
    return getReleasesInfo(data);
}

async function getReleaseStats(url: string) {
    const data = await getReleaseJSON(url);
    return getReleaseInfo(data);
}

async function getAllReleaseStats(): Promise<Record<string, ReleaseInfo>> {
    const wfpReleasesUrl = getUrlFromTag("wfp");
    const gtaReleaseUrl = getUrlFromTag("gtaivfusionfix");
    const mp3ReleaseUrl = getUrlFromTag("mp3fusionfix");
    const aiReleaseUrl = getUrlFromTag("alienisolation");

    const [wfpStats, gtaStats, mp3Stats, aiStats] = await Promise.all([
        getReleasesStats(wfpReleasesUrl),
        getReleaseStats(gtaReleaseUrl),
        getReleaseStats(mp3ReleaseUrl),
        getReleaseStats(aiReleaseUrl),
    ]);

    return { ...wfpStats, "gtaivfusionfix": gtaStats, "mp3fusionfix": mp3Stats, "alienisolation": aiStats };
}

export const wfpReleasesInfo = await getAllReleaseStats();
