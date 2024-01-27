const express = require("express");
const { default: axios } = require("axios");
const { job } = require("cron");
const FuzzySearch = require("fuzzy-search");
const JSON5 = require("json5");
const app = express();
const PORT = process.env["PORT"] || 3000;
const fs = require("fs");
const repositories = fs.readdirSync("./repositories")
.map((file) => JSON5.parse(fs.readFileSync(`./repositories/${file}`, "utf8")));

let tweaks = [];
let repos = [];

job({
    cronTime: "*/5 * * * *",
    runOnInit: true,
    start: true,
    onTick: async () => {
        let packagecache = [];
        let repositorycache = [];
        const requests = 
        repositories.map((repo) => axios.get(repo.URL));
        for (const request of requests) {
            try {
                const res = await request;
                const data = typeof res.data !== "object" ? JSON5.parse(res.data) : res.data;
                if (data.RepositoryName) {
                    for (const tweak_data of data.RepositoryContents) {

                        const repository = {
                            name: data.RepositoryName,
                            link: res.config.url,
                            description: data.RepositoryDescription,
                            author: data.RepositoryAuthor,
                            website: data.RepositoryWebsite,
                            icon: data.RepositoryIcon,
                            default: data.Default,
                            type: "misaka"
                        }

                        const tweak = {
                            name: tweak_data.Name,
                            description: tweak_data.Description,
                            caption: tweak_data.Caption,
                            author: tweak_data?.Author?.Label,
                            icon: tweak_data.Icon,
                            banner: tweak_data.HeaderImage,
                            screenshots: tweak_data.Screenshot,
                            category: tweak_data.Category,
                            embeds: tweak_data.Embed,
                            package: {
                                path: tweak_data.Releases.at(-1).Package,
                                version: tweak_data.Releases.at(-1).Version,
                                description: tweak_data.Releases.at(-1).Description,
                                compatible: {
                                    min: tweak_data?.AdditionalSupportedIOS?.MinIOSVersion_CustomLabel || tweak_data.MinIOSVersion,
                                    max: tweak_data?.AdditionalSupportedIOS?.MaxIOSVersion_CustomLabel || tweak_data.MaxIOSVersion,
                                    builds: tweak_data?.AdditionalSupportedIOS?.Build,
                                    exploit: tweak_data?.compatibleExploit,
                                    os: tweak_data?.CompatibleOS
                                }
                            },
                            packageid: tweak_data.PackageID,
                            repository
                        }

                        packagecache.push(tweak);
                        repositorycache.push(repository);

                    }
                } else {
                    for (const tweak_data of data.packages) {
                        const repoUrl = res.config.url;
                        const splitUrl = repoUrl.split("/");
                        splitUrl.pop();

                        const repository = {
                            name: data.name,
                            link: res.config.url,
                            description: data.description,
                            author: null,
                            website: null,
                            icon: [...splitUrl, data.icon].join("/"),
                            default: null,
                            type: "Picasso/PureKFD"
                        }

                        const tweak = {
                            name: tweak_data.name,
                            description: tweak_data.description,
                            caption: tweak_data.long_description,
                            author: tweak_data.author,
                            icon: tweak_data.icon ? [...splitUrl, tweak_data.icon].join("/") : null,
                            banner: tweak_data.banner ? [...splitUrl, tweak_data.banner].join("/") : null,
                            screenshots: tweak_data.screenshots?.length ? tweak_data.screenshots.map(path => [...splitUrl, path].join("/")) : null,
                            category: null,
                            embeds: null,
                            package: {
                                path: [...splitUrl, tweak_data.path].join("/"),
                                version: tweak_data.version,
                                description: null,
                                compatible: {
                                    min: null,
                                    max: null,
                                    builds: null,
                                    exploit: null
                                }
                            },
                            packageid: tweak_data.bundleid,
                            repository
                        }
                        packagecache.push(tweak);
                        repositorycache.push(repository);
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }
        tweaks = packagecache;
        repos = repositorycache;
    }
});

app.get("/api/v2/tweaks/search", async (req, res) => {
    const { q, limit } = req.query;
    const _limit = Number.isNaN(limit) ? 50 : limit > 50 ? 50 : limit;
    if (!q || q.length < 2) return res.status(400).json({
        status: "400 Bad Request",
        message: "query parameter (q) must be at least 2 characters long"
    });
    const searcher = new FuzzySearch(tweaks, [ "name", "description", "packageid" ]);
    const foundTweaks = searcher.search(q).slice(0, _limit);
    res.status(200).json({
        status: "200 OK",
        count: foundTweaks.length,
        tweaks: foundTweaks
    });
});

app.get("/api/v2/tweaks/:packageId", async (req, res) => {
    const { packageId } = req.params;
    const packageIds = packageId.split(",");
    const foundTweaks = tweaks.filter((tweak) => packageIds.includes(tweak.packageid));
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

app.get("/api/v2/repos", async (req, res) => {
    res.status(200).json({
        status: "200 OK",
        repos
    });
});

app.get("/api/v2/repos/:slug", async (req, res) => {
    const { slug } = req.params;
    const foundRepo = 
    repos.find((repo) => repo.link === repositories.find((r) => r.Slug === slug)?.URL);
    res.status(200).json({
        status: "200 OK",
        tweaks: foundRepo
    });
});

app.listen(PORT, () => console.log(`LISTENING ON ${PORT}`));