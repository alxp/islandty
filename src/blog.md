---
title: 'alxp.ca Blog'
layout: 'layouts/feed.html'
pagination:
  data: collections.blog
  size: 5
permalink: 'blog{% if pagination.pageNumber > 0 %}/page/{{ pagination.pageNumber }}{% endif %}/index.html'
paginationPrevText: 'Newer posts'
paginationNextText: 'Older posts'
paginationAnchor: '#post-list'
---

Some writing I've done, mostly long e-mails that end up being something I feel like other people might find useful.
