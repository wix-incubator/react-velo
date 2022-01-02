module.exports = {
    testPathIgnorePatterns: [
        "dist/.*",
    ],
    transform: {
        "^.+\\.tsx?$": ['babel-jest', {rootMode: "upward"}]
    },
};