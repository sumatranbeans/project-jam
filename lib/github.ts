export async function createRepo(token: string, name: string, isPrivate: boolean = true) {
  const response = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      private: isPrivate,
      auto_init: true,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create repository')
  }

  return response.json()
}

export async function getUser(token: string) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get GitHub user')
  }

  return response.json()
}

export async function commitAndPush(
  token: string,
  owner: string,
  repo: string,
  files: { path: string; content: string }[],
  message: string
) {
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json',
  }

  const refResponse = await fetch(`${baseUrl}/git/ref/heads/main`, { headers })
  const refData = await refResponse.json()
  const latestCommitSha = refData.object.sha

  const commitResponse = await fetch(`${baseUrl}/git/commits/${latestCommitSha}`, { headers })
  const commitData = await commitResponse.json()
  const treeSha = commitData.tree.sha

  const blobs = await Promise.all(
    files.map(async (file) => {
      const blobResponse = await fetch(`${baseUrl}/git/blobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: file.content, encoding: 'utf-8' }),
      })
      const blobData = await blobResponse.json()
      return { path: file.path, sha: blobData.sha, mode: '100644', type: 'blob' }
    })
  )

  const treeResponse = await fetch(`${baseUrl}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ base_tree: treeSha, tree: blobs }),
  })
  const treeData = await treeResponse.json()

  const newCommitResponse = await fetch(`${baseUrl}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message,
      tree: treeData.sha,
      parents: [latestCommitSha],
    }),
  })
  const newCommitData = await newCommitResponse.json()

  await fetch(`${baseUrl}/git/refs/heads/main`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ sha: newCommitData.sha }),
  })

  return newCommitData
}