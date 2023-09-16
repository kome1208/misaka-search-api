import e from "express";
import { packages } from "../../../server.mjs";

const router = e.Router();

router.get("/misaka/tweaks/:packageId", async (req, res) => {
    if (req.params.packageId) {
        try {
            const result = packages.get(req.params.packageId);
            if (!result) {
                return res.status(200).json({
                    status: 200,
                    count: 0
                });
            }
            res.status(200).json({
                status:200,
                count: 1,
                package: result
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