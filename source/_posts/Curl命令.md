---
layout: curl
title: 命令
date: 2021-02-23 15:27:53
tags: linux
---
[原始链接-阮一峰的网络日志-curl的用法指南](http://www.ruanyifeng.com/blog/2019/09/curl-reference.html)

curl 是常用的命令行工具，用来请求 Web 服务器。它的名字就是客户端（client）的 URL 工具的意思。

### -A
**-A**指定客户端你的用户代理头，即**User-Agent**。curl的默认用户代理字符串是**curl/[version]**

```
$ curl -A 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36' https://google.com
```


