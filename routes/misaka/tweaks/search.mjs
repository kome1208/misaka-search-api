import e from "express";
import Fuse from "fuse.js";
import { packages } from "../../../server.mjs";

const router = e.Router();

router.get("/misaka/tweaks/search", async (req, res) => {
    if (req.query.q) {
        const limit = req.query.limit ? req.query.limit : 50;
        try {
            const fuse = new Fuse(packages.map((pkg) => pkg), {
                keys: ["Name", "Description", "PackageID"]
            });
            const results = fuse.search(req.query.q, {limit:limit});
            if (results.length <= 0) {
                return res.status(200).json({
                    status: 200,
                    count: 0
                });
            }
            res.status(200).json({
                status: 200,
                count: results.length,
                packages: results.map(({item}) => item)
            });
        } catch (e) {
            res.status(500).json({
                status:500,
                message:"Internal Server Error"
            });
            console.error(e);
        }
    } else {
        res.status(500).json({
            status:500,
            message:"Internal Server Error"
        });
    }
});

export default router;