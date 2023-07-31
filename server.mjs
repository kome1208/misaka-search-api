import e from "express";
import { job } from "cron";
import got from "got";
import { Collection } from "@discordjs/collection";

import TweakSearch from "./routes/misaka/tweaks/search.mjs";

const ignoreRepos = ["https://raw.githubusercontent.com/tyler10290/MisakaRepoBackup/main/repo.json"];
const app = e();
const port = process.env["PORT"] || 3030;

const packages = new Collection();
const repositories = new Collection();
job({
    cronTime:"0 0,30 * * * *",
    runOnInit:true,
    start:true,
    onTick:async () => {
        const default_repos = await got.get("https://raw.githubusercontent.com/shimajiron/Misaka_Network/main/Default_Repositories.json").json();
        const repo_links = default_repos.flatMap(({Repositories}) => Repositories).filter((link) => !ignoreRepos.includes(link));
        for (let i = 0; i < repo_links.length; i++) {
            try {
                const data_text = await got.get(repo_links[i]).text();
                const repo_data = JSON.parse(data_text.replace(/}(?:\s{1,})?,(?:\s{1,})?]/g, "}]"));
                repo_data.RepositoryContents.forEach((data) => {
                    data.Repository = {
                        Name: repo_data.RepositoryName,
                        Link: repo_links[i],
                        Description: repo_data.RepositoryDescription,
                        Author: repo_data.RepositoryAuthor,
                        Website: repo_data.RepositoryWebsite,
                        Icon: repo_data.RepositoryIcon,
                        Default: repo_data.Default
                    };
                    packages.set(data.PackageID, data);
                });
                repositories.set(repo_links[i], repo_data);
            } catch (e) {}
        }
    }
});

app.use(TweakSearch);
app.listen(port, () => console.log(`LISTENING ON ${port}`));

export { app, packages, repositories };