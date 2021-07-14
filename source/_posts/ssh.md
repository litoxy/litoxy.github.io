---
layout: remote-ssh
title: Remote-ssh can not connect unless delete .vscode-server folder on the remote every time using ssh
date: 2021-07-01 13:36:34
tags: vscode
---
新公司一切都是新的，操作系统也是。六年多的mac os,因为换了工作重新开始使用windows，刚开始各种不适应慢慢的也习惯了。

公司的开发环境是linux，要求使用citrix Receiver 连接使用。那画面感觉回到了80年代大屁股显示器的时候。最后发现开发环境是可以使用SSH访问的，就在windows上安装了vscode然后使用 Remote Development开发。最近不知道什么原因总是频繁单开连接，多次输入密码无果。重启ide又可以了。

然后在 [vocode remote](https://github.com/microsoft/vscode-remote-release)  的 issues 看到这样一条。[Remote-ssh can not connect unless delete .vscode-server folder on the remote every time using ssh.](https://github.com/microsoft/vscode-remote-release/issues/2828)

只要删除vscode-server 下面的Log文件就可以正常使用了。

```perl
rm ~/.vscode-server/.*.log
```

另外也又人提到可以将**vscode 更新到最新版本**就可以解决这个问题。

忽然,灵光一闪.我前两天跟新了最新,感觉问题是出在这个新的版本。以下是我的版本信息，如果有同学遇到相同问题可以尝试删除log文件。是否可以解决问题

```
版本: 1.57.1 (user setup)
提交: 507ce72a4466fbb27b715c3722558bb15afa9f48
日期: 2021-06-17T13:28:07.755Z
Electron: 12.0.7
Chrome: 89.0.4389.128
Node.js: 14.16.0
V8: 8.9.255.25-electron.0
OS: Windows_NT x64 10.0.18363
```
另外，官方提供了一个脚本文件。也可以尝试下。

```
#!/bin/bash
# Script to update VScode

#grab the current commit id
COMMIT_ID=`ls -At  ~/.vscode-server/bin | head -n 1`
cd ~/.vscode-server/bin/$COMMIT_ID

#unlock it
rm ./vscode-remote-lock*

#download package and unpack it
wget https://update.code.visualstudio.com/commit:$COMMIT_ID/server-linux-x64/stable
tar -xvzf ./stable --strip-components 1

if [ $? -eq 0 ]; then
	rm ./stable
	echo "Successfully updated VScode"
else
  echo "Failed to download and untar VScode update"
fi
```


