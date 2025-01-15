<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="订单编号" prop="orderNo">
        <el-input
            v-model="queryParams.orderNo"
            placeholder="请输入订单编号"
            clearable
            @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="创建时间">
        <el-date-picker clearable
          v-model="dateRange"
          value-format="YYYY-MM-DD"
          type="daterange"
          range-separator="-"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          unlink-panels
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="orderList">
      <el-table-column label="序号" align="center" type="index" width="50px" prop="id"/>
      <el-table-column label="订单编号" align="center" prop="orderNo" show-overflow-tooltip="" />
      <el-table-column label="商品名称" align="center" prop="skuName"/>
      <el-table-column label="订单金额" align="center" prop="amount">
        <template #default="scope">
          <el-tag>{{ scope.row.amount }}元</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="设备编号" align="center" prop="innerCode"/>
      <el-table-column label="订单状态" align="center" prop="status">
        <template #default="scope">
          <dict-tag :options="order_status" :value="scope.row.status"/>
        </template>
      </el-table-column>
      <el-table-column label="订单时间" align="center" prop="createTime" width="180">
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime, '{y}-{m}-{d} {h}:{h}:{s}') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" @click="handleUpdate(scope.row)" v-hasPermi="['manage:order:query']">查看详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
        v-show="total>0"
        :total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="getList"
    />

    <!-- 查看详情对话框 -->
    <el-dialog :title="title" v-model="orderOpen" width="700px" append-to-body>
      <el-form ref="orderRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="订单编号：">
              <span>{{ form.orderNo }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="商品名称：">
              <span>{{ form.skuName }}</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="订单金额：">
              <el-tag>{{ form.amount }}元</el-tag>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="订单状态：">
              <!-- 使用 dict-tag 组件展示订单状态（数据字典） -->
              <dict-tag :options="order_status" :value="form.status" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="设备编号：">
              <span>{{ form.innerCode }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备地址：">
              <span>{{ form.addr }}</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="创建时间：">
              <span>{{ form.createTime }}</span>
            </el-form-item>
          </el-col>
          <!-- 完成时间（仅当状态为支付完成时显示） -->
          <el-col :span="12" v-if="form.status === 1">
            <el-form-item label="完成时间：">
<!--              <span>{{ form.completeTime }}</span>-->

            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12" v-if="form.status === 1">
            <el-form-item label="支付方式：" >
              <span>{{ form.payType }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="form.status === 1">
            <el-form-item label="交易单号：">
              <span>{{ form.thirdNo }}</span>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer" style="display: flex; justify-content: space-between;">
          <div>
            <!-- 退款按钮（仅当状态为支付完成时显示） -->
            <el-button type="danger" v-if="form.status === 1" @click="handleRefund">退 款</el-button>
            <!-- 关闭订单按钮（仅当状态为待支付时显示） -->
            <el-button v-if="form.status === 0" type="warning" @click="handleCloseOrder">关闭订单</el-button>
          </div>

          <div>
            <el-button type="primary" @click="submitForm">确 定</el-button>
            <el-button @click="cancel">取 消</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Order">
import {listOrder, getOrder, delOrder, addOrder, updateOrder} from "@/api/manage/order";
import {parseTime} from "../../../utils/ruoyi.js";
import { ElMessageBox, ElMessage } from 'element-plus';

const {proxy} = getCurrentInstance();
const {order_status} = proxy.useDict('order_status');

const orderList = ref([]);
const open = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const total = ref(0);
const title = ref("");
const dateRange = ref([]);

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    orderNo: null,
    createTime: null,
  },
  rules: {
    orderNo: [
      {required: true, message: "订单编号不能为空", trigger: "blur"}
    ],
    amount: [
      {required: true, message: "订单金额不能为空", trigger: "blur"}
    ],
    price: [
      {required: true, message: "商品金额不能为空", trigger: "blur"}
    ],
  }
});

const {queryParams, form, rules} = toRefs(data);

/** 查询订单列表 */
function getList() {
  loading.value = true;
  listOrder(proxy.addDateRange(queryParams.value, dateRange.value)).then(response => {
    orderList.value = response.rows;
    total.value = response.total;
    loading.value = false;
  });
}

// 取消按钮
function cancel() {
  orderOpen.value = false;
  reset();
}

// 表单重置
function reset() {
  form.value = {
    id: null,
    orderNo: null,
    thirdNo: null,
    innerCode: null,
    channelCode: null,
    skuId: null,
    skuName: null,
    classId: null,
    status: null,
    amount: null,
    price: null,
    payType: null,
    payStatus: null,
    bill: null,
    addr: null,
    regionId: null,
    regionName: null,
    businessType: null,
    partnerId: null,
    openId: null,
    nodeId: null,
    nodeName: null,
    cancelDesc: null,
    createTime: null,
    updateTime: null
  };
  proxy.resetForm("orderRef");
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1;
  getList();
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef");
  dateRange.value = [];
  handleQuery();
}

/** 修改按钮操作 */
const orderOpen = ref(false);

function handleUpdate(row) {
  const _id = row.id
  getOrder(_id).then(response => {
    form.value = response.data;
    title.value = "订单详情";
  });
  orderOpen.value = true;
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["orderRef"].validate(valid => {
    if (valid) {
      if (form.value.id != null) {
        updateOrder(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功");
          open.value = false;
          getList();
        });
      } else {
        addOrder(form.value).then(response => {
          proxy.$modal.msgSuccess("新增成功");
          open.value = false;
          getList();
        });
      }
    }
  });
}

/** 退款按钮 */
function handleRefund(){
  ElMessageBox.confirm('确定要退款吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
      .then(() => {
        // 先跳过逻辑，直接提示
        ElMessage.success('退款成功');
      })
      .catch(() => {
        ElMessage.info('已取消');
      });
}

function handleCloseOrder(){
  ElMessageBox.confirm('确定要关闭订单吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
      .then(() => {
        // 先跳过逻辑，直接提示
        ElMessage.success('关闭订单成功');
      })
      .catch(() => {
        ElMessage.info('已取消');
      });
}



getList();
</script>


<style scoped>
.dialog-footer {
  text-align: right;
}

.dialog-footer {
  padding: 10px 20px; /* 调整 footer 的内边距 */
}
.dialog-footer .el-button {
  margin-right: 10px; /* 调整按钮之间的间距 */
}
</style>