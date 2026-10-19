// Decides whether a student may apply to a job. Returns every failing reason so the
// UI can explain why the Apply button is disabled.
const checkEligibility = (student, job) => {
    const reasons = [];

    if (!student.isProfileComplete) {
        reasons.push("Complete your profile to apply");
        return { eligible: false, reasons };
    }

    if (new Date(job.lastDate) < new Date()) {
        reasons.push("Application deadline has passed");
    }

    if (Number(job.eligibleBatch) !== Number(student.graduatingYear)) {
        reasons.push(`Only for ${job.eligibleBatch} batch`);
    }

    const branches = (job.eligibleBranches || []).map((b) => String(b).toLowerCase());
    const branch = String(student.branch || "").toLowerCase();
    if (!branches.includes("all") && !branches.includes(branch)) {
        reasons.push(`Only for ${branches.join(", ").toUpperCase()} branches`);
    }

    const minimumCgpa = parseFloat(job.minimumCgpa);
    if (!isNaN(minimumCgpa) && Number(student.cgpi) < minimumCgpa) {
        reasons.push(`Minimum CGPA ${minimumCgpa} required`);
    }

    return { eligible: reasons.length === 0, reasons };
};

export { checkEligibility };
