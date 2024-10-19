import * as core from '@actions/core'
import * as github from '@actions/github'
import { readFileSync } from 'fs'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // Get the PR number from the payload. This action is only intended for PRs.
    const prNumber = github.context.payload.pull_request?.number
    if (!prNumber) {
      return
    }

    // Get the required reviewer from the REVIEWERS file.
    // This simplified example assumes that the REVIEWERS file contains a single reviewer.
    // In a real-world scenario, we would need to parse the REVIEWERS file at the top directory
    // of our changed files to get the reviewers.
    const reviewer = readFileSync('REVIEWERS', 'utf8').trim()
    if (!reviewer) {
      core.setFailed('No reviewer found in REVIEWERS file')
      return
    }

    // Get all the reviews for this PR.
    const githubToken = core.getInput('github-token')
    const octokit = github.getOctokit(githubToken)
    const reviews = await octokit.rest.pulls.listReviews({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: prNumber
    })

    // Check if the required reviewer has approved the PR.
    // This action does not require the reviewer to re-approve the PR if new changes are pushed.
    let approved = false
    reviews.data.forEach(review => {
      if (review.user?.login === reviewer && review.state === 'APPROVED') {
        approved = true
      }
    })

    // Fail the workflow run if the required reviewer has not approved the PR.
    if (!approved) {
      core.setFailed(`Reviewer ${reviewer} needs to approve the PR`)
      return
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
