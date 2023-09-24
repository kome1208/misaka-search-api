const express = require("express");
const { default: axios } = require("axios");
const { job } = require("cron");
const FuzzySearch = require("fuzzy-search");
const JSON5 = require("json5");
const app = express();
const PORT = process.env["PORT"] || 3000;
let tweaks = [];
const ignoreRepos = ["https://raw.githubusercontent.com/tyler10290/MisakaRepoBackup/main/repo.json", "https://raw.githubusercontent.com/p0s3id0n86/misakarepo/main/Repo/repo.json"];

job({
    cronTime: "*/5 * * * *",
    runOnInit: true,
    start: true,
    onTick: async () => {
        let cache = [];
        const default_repos = await axios.get("https://raw.githubusercontent.com/shimajiron/Misaka_Network/main/Default_Repositories.json");
        const requests = default_repos.data
        .flatMap(({ Repositories }) => (Repositories))
        .filter((url) => !ignoreRepos.includes(url))
        .map((url) => axios.get(url));
        for (const request of requests) {
            try {
                const res = await request;
                const data = typeof res.data !== "object" ? JSON5.parse(res.data) : res.data;
                for (const tweak of data.RepositoryContents) {
                    tweak.Repository = {
                        Name: data.RepositoryName,
                        Link: res.config.url,
                        Description: data.RepositoryDescription,
                        Author: data.RepositoryAuthor,
                        Website: data.RepositoryWebsite,
                        Icon: data.RepositoryIcon,
                        Default: data.Default
                    };
                    cache.push(tweak);
                }
            } catch (err) {
                console.error(err);
            }
        }
        tweaks = cache;
    }
});

app.get("/api/v1/tweaks/search", async (req, res) => {
    const { q, limit } = req.query;
    const _limit = Number.isNaN(limit) ? 50 : limit > 50 ? 50 : limit;
    if (!q || q.length < 2) return res.status(400).json({
        status: "400 Bad Request",
        message: "query parameter (q) must be at least 2 characters long"
    });
    const searcher = new FuzzySearch(tweaks, [ "Name", "Description", "PackageID" ]);
    const foundTweaks = searcher.search(q).slice(0, _limit);
    res.status(200).json({
        status: "200 OK",
        count: foundTweaks.length,
        tweaks: foundTweaks
    });
});

app.get("/api/v1/tweaks/:packageId", async (req, res) => {
    const { packageId } = req.params;
    const packageIds = packageId.split(",");
    const foundTweaks = tweaks.filter((tweak) => packageIds.includes(tweak.PackageID));
    if (!foundTweaks.length) return res.status(404).json({
        status: "404 Not Found",
        message: "Tweak not found"
    });
    res.status(200).json({
        status: "200 OK",
        count: foundTweaks.length,
        tweaks: foundTweaks
    });
});


app.listen(PORT, () => console.log(`LISTENING ON ${PORT}`));