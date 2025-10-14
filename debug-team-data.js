// Debug script to test team creation data structure
// Run this to see the exact data being sent to the API

console.log("=== Team Creation Debug ===");

// Test data structure for basic team creation
const basicTeamData = {
  name: "Test Team",
  description: "A test team for debugging"
};

console.log("✅ Basic Team Data (should work):");
console.log(JSON.stringify(basicTeamData, null, 2));

// Test data structure with members (should be handled separately)
const teamDataWithMembers = {
  name: "Test Team with Members",
  description: "A test team with initial members",
  initialMembers: [
    { email: "user1@example.com", role: "ADMIN" },
    { email: "user2@example.com", role: "MEMBER" }
  ]
};

console.log("\n❌ Team Data with Members (was causing 400 error):");
console.log(JSON.stringify(teamDataWithMembers, null, 2));

console.log("\n🔧 Fixed approach:");
console.log("1. Create team with basic data first");
console.log("2. Then send individual invitations for each member");

// Expected backend DTO structure
const expectedBackendDTO = {
  name: "string (required, 1-100 chars)",
  description: "string (optional, max 500 chars)"
};

console.log("\n📋 Expected Backend DTO:");
console.log(JSON.stringify(expectedBackendDTO, null, 2));

console.log("\n🎯 Solution implemented:");
console.log("- createTeam() for basic team creation");
console.log("- createTeamWithMembers() for team + invitations");
console.log("- Frontend uses appropriate function based on initialMembers");