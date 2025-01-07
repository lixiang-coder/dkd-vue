import request from '@/utils/request'

// 查询角色管理列表
export function listRole(query) {
  return request({
    url: '/manage/role/list',
    method: 'get',
    params: query
  })
}

// 查询角色管理详细
export function getRole(roleId) {
  return request({
    url: '/manage/role/' + roleId,
    method: 'get'
  })
}

// 新增角色管理
export function addRole(data) {
  return request({
    url: '/manage/role',
    method: 'post',
    data: data
  })
}

// 修改角色管理
export function updateRole(data) {
  return request({
    url: '/manage/role',
    method: 'put',
    data: data
  })
}

// 删除角色管理
export function delRole(roleId) {
  return request({
    url: '/manage/role/' + roleId,
    method: 'delete'
  })
}
