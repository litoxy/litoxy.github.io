---
title: Vue初始化data
date: 2021-07-14 17:41:26
tags:vue
---

 相信很多使用Vue开发项目的同学都会遇到这样一个问题。列表下拉刷新的时候,需要将列表信息以及相关的分页信息都初始化。之前的做法是会在声明一个initial data，下拉刷新前重新用initialdata设置data.

之前在看vue的api的时候发现有一个名为[$options](https://cn.vuejs.org/v2/api/index.html#vm-options)的property.官方给出的定义是

> 用于当前 Vue 实例的初始化选项。需要在选项中包含自定义 property 时会有用处：

