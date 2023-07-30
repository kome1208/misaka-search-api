import got from "got";
import Fuse from "fuse.js";
import e from "express";
import { job } from "cron";

let packages;
const server = e();

await init();

server.get("/misaka/search", async (req, res) => {
    if (req.query.q) {
        const limit = req.query.limit < 100 ? req.query.limit : 100;
        try {
            const fuse = new Fuse(packages, {
                keys: ["Name", "Description", "PackageID"]
            });
            const results = fuse.search(req.query.q, {limit:limit});
            res.json({
                status:"ok",
                packages: results.map(({item}) => item)
            });
        } catch (e) {
            res.sendStatus(500);
            console.error(e);
        }
    } else {
        res.sendStatus(500);
    }
});

async function getRepos() {
    const default_repos = await got.get("https://raw.githubusercontent.com/shimajiron/Misaka_Network/main/Default_Repositories.json").json();
    const repo_links = default_repos.flatMap(({Repositories}) => Repositories);
    const cache = [];
    for (let i = 0; i < repo_links.length; i++) {
        try {
            const repo_data = await got.get(repo_links[i]).json();
            repo_data.RepositoryContents.forEach((data) => {
                data.Repository = {
                    Name: repo_data.RepositoryName,
                    Link: repo_links[i],
                    Description: repo_data.RepositoryDescription,
                    Author: repo_data.RepositoryAuthor,
                    Website: repo_data.RepositoryWebsite,
                    Icon: repo_data.RepositoryIcon
                }
            });
            cache.push(repo_data.RepositoryContents);
        } catch (e) {}
    }
    packages = cache.flat();
}

async function init() {
    job({
        cronTime:"0 0,30 * * * *",
        runOnInit:true,
        start:true,
        onTick:async () => {
            await getRepos();
        }
    });
    server.listen(process.env["PORT"], () => console.log("READY"));
}