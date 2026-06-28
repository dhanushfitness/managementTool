import dotenv from "dotenv";
import watchDogClient from "../services/watchDogClient.js";

dotenv.config();

async function createtest() {
    console.log("Creating employee in WatchDog...");
    try {

        const payload = {
            emp_code: "MEMTEST001",
            first_name: "Sudharshan",
            last_name: "R",
            mobile: "9876543210",
            email: "sudharshan@test.com",
            gender: "M",
            hire_date: new Date().toISOString().split("T")[0],
            verify_mode: -1,
            emp_type: 1,
            enable_att: true,
            department: "1",
            position: "1",
            area: ["2,GYM"],
        }
        const response = await watchDogClient.createEmployee(payload);

        console.log("SUCCESS");
        console.log(response);

    } catch (err) {

        console.error("FAILED");
        console.error(err.response?.data || err.message);

    }
}

async function updatetest() {
    console.log("Updating employee in WatchDog...");
    await watchDogClient.login();
    try {

        const payload = {
            emp_code: "MEM000756",
            validity_start: "2026-06-28",
            validity_end: "2026-06-28",
            department: "1",
            position: "1",
            area: ["2,GYM"],
        }
        const response = await watchDogClient.updateEmployeeValidity(payload);

        // const response = await watchDogClient.client.get("/personnel/api/employees/MEM000756/");

        console.log("SUCCESS");
        console.log(response);

    } catch (err) {

        console.error("FAILED");
        console.error(err.response?.data || err.message);

    }
}

// createtest();
updatetest();