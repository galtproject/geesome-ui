module.exports = `
<div>
  <div class="posts-list">
    <h2>Post #{{postId}}</h2>
    <post-item v-if="post" v-model="post" :show-bluesky-controls="true"></post-item>
  </div>
</div>
`;
