import * as https from "node:https";
import * as fs from "node:fs/promises";

const query = `
query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
  problemsetQuestionList: questionList(
    categorySlug: $categorySlug
    limit: $limit
    skip: $skip
    filters: $filters
  ) {
    total: totalNum
    questions: data {
      questionId
      questionFrontendId
      title
      titleSlug
      topicTags {
        name
      }
      difficulty
      isPaidOnly
    }
  }
}
`;

const variables = {
  categorySlug: "",
  limit: 5000,
  skip: 0,
  filters: {},
};

const postData = JSON.stringify({
  query,
  variables,
});

const options = {
  hostname: "leetcode.com",
  path: "/graphql",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(postData),
  },
};

const req = https.request(options, (res) => {
  console.log("Status code:", res.statusCode);
  console.log("Headers:", res.headers);

  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", async () => {
    try {
      await fs.writeFile(
        "data.json",
        JSON.stringify(JSON.parse(data), null, 2),
      );
      console.log("Response saved to data.json");
    } catch (err) {
      console.error("Error saving data:", err);
    }
  });
});

req.on("error", (e) => {
  console.error("Request error:", e);
});

// Send POST data
req.write(postData);
req.end();
