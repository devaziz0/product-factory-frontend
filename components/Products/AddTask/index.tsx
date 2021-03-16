import React, {useEffect, useState} from 'react';
import {connect} from 'react-redux';
import {Modal, Row, Col, Input, Select, message, Button} from 'antd';
import {useMutation, useQuery} from '@apollo/react-hooks';
import {
  GET_CAPABILITIES_BY_PRODUCT_AS_LIST,
  GET_INITIATIVES,
  GET_STACKS,
  GET_TAGS,
  GET_USERS
} from '../../../graphql/queries';
import {CREATE_TASK, CREATE_CODE_REPOSITORY, UPDATE_TASK} from '../../../graphql/mutations';
import {TASK_TYPES} from '../../../graphql/types';
// import {addRepository} from '../../../lib/actions';
// import {WorkState} from '../../../lib/reducers/work.reducer';
import AddInitiative from '../AddInitiative';
import {PlusOutlined, MinusOutlined} from '@ant-design/icons';
import {RICH_TEXT_EDITOR_WIDTH} from '../../../utilities/constants';
import dynamic from "next/dynamic";
import {getProp} from "../../../utilities/filters";


const {Option} = Select;
const {TextArea} = Input;

interface IUser {
  fullName: string
  slug: string
}

const RichTextEditor = dynamic(
  () => import('../../TextEditor'),
  {ssr: false}
);

const filterRepositoryId = (arr: Array<any>, url: string) => {
  const filteredArr = arr.filter((item: any) => item.repository === url);
  return filteredArr.length ? filteredArr[0].id : null;
}

type Props = {
  modal?: boolean;
  productSlug?: string;
  closeModal: any;
  currentProduct?: any;
  repositories?: Array<any>;
  addRepository?: any;
  tags?: any;
  modalType?: boolean;
  task?: any;
  submit?: any;
  tasks?: Array<any>;
  stacks?: Array<any>;
};

const AddTask: React.FunctionComponent<Props> = (
  {
    modal,
    productSlug,
    closeModal,
    repositories,
    addRepository,
    modalType,
    task,
    submit,
    tasks
  }
) => {
  const [title, setTitle] = useState(modalType ? task.title : '');
  const [description, setDescription] = useState(modalType ? task.description : '');
  const [allCapabilities, setAllCapabilities] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [skip, setSkip] = React.useState(false);
  const [allStacks, setAllStacks] = useState([]);
  const [shortDescription, setShortDescription] = useState(
    modalType ? task.shortDescription : ''
  );
  const [status, setStatus] = useState(modalType ? task.status : 2);
  const [capability, setCapability] = useState(
    modalType && task.capability ? task.capability.id : 0
  );
  const [initiative, setInitiative] = useState(
    modalType && task.initiative ? task.initiative.id : 0
  );
  const [repository, setRepository] = useState(
    modalType && repositories && repositories.length > 0
      ? filterRepositoryId(repositories, task.repository)
      : null
  );
  const [initiatives, setInitiatives] = useState([])
  const [editRepository, toggleRepository] = useState(false);
  const [editInitiative, toggleInitiative] = useState(false);
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [detailUrl, setDetailUrl] = useState(modalType ? task.detailUrl : '');
  const [tags, setTags] = useState(
    modalType && task.tag ? task.tag.map((tag: any) => tag.id) : []
  );
  const [stacks, setStacks] = useState(
    modalType && task.stack ? task.stack.map((stack: any) => stack.id) : []
  );
  const [dependOn, setDependOn] = useState(
    modalType && task.dependOn ? task.dependOn.map((tag: any) => tag.id) : []
  );

  const {data: originalInitiatives, loading: initiativeLoading, refetch: fetchInitiatives} = useQuery(GET_INITIATIVES, {
    variables: {productSlug}
  });
  const {data: capabilitiesData} = useQuery(GET_CAPABILITIES_BY_PRODUCT_AS_LIST, {
    variables: {productSlug}
  });
  const {data: tagsData} = useQuery(GET_TAGS);
  const {data: stacksData} = useQuery(GET_STACKS);
  const [createTask] = useMutation(CREATE_TASK);
  const [updateTask] = useMutation(UPDATE_TASK);
  const [createCodeRepository] = useMutation(CREATE_CODE_REPOSITORY);
  const [allUsers, setAllUsers] = useState([]);
  const [reviewSelectValue, setReviewSelectValue] = useState(getProp(task, 'reviewer.slug', ''));
  const {data: users} = useQuery(GET_USERS);

  const filterOption = (input: string, option: any) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0;

  useEffect(() => {
    setAllUsers(getProp(users, 'people', []));
  }, [users]);

  useEffect(() => {
    if (capabilitiesData && capabilitiesData.capabilitiesAsList) {
      setAllCapabilities(capabilitiesData.capabilitiesAsList);
    }
  }, [capabilitiesData]);

  useEffect(() => {
    if (tagsData && tagsData.tags) setAllTags(tagsData.tags)
  }, [tagsData]);

  useEffect(() => {
    if (stacksData && stacksData.stacks) setAllStacks(stacksData.stacks)
  }, [stacksData]);

  useEffect(() => {
    if (!initiativeLoading && !!originalInitiatives && !skip) {
      setSkip(true)
    }
  }, [originalInitiatives, initiativeLoading]);

  useEffect(() => {
    if (!skip) fetchInitiatives({productSlug})
  }, [skip]);

  useEffect(() => {
    if (originalInitiatives) {
      setInitiatives(originalInitiatives.initiatives);
    }
  }, [originalInitiatives]);

  // TextEditor configuration
  const onDescriptionChange = (value: any) => {
    setDescription(value);
  };

  const handleOk = async () => {
    if (!title) {
      message.error("Title is required. Please fill out title");
      return;
    }
    if (!description) {
      message.error("Description is required. Please fill out description");
      return;
    }
    if (!reviewSelectValue) {
      message.error("Reviewer is required. Please fill out reviewer");
      return;
    }

    await addNewTask();
  };

  const handleCancel = () => {
    closeModal(!modal);
    clearData();
  };

  const clearData = () => {
    setTitle("");
    setStatus(2);
    setDescription("");
    setShortDescription("");
    setCapability(0);
    setInitiative(0);
    setRepository(null);
    setRepositoryUrl("");
    setCapability([]);
    setTags([]);
    setStacks([]);
    setDependOn([]);
  }

  const addNewTask = async () => {
    const input = {
      title,
      description: description.toString('html'),
      shortDescription: shortDescription,
      status: status,
      productSlug,
      initiative: initiative === 0 ? null : parseInt(initiative),
      capability: capability === 0 ? null : parseInt(capability),
      repository: repository === 0 ? null : parseInt(repository),
      tags,
      stacks,
      dependOn,
      detailUrl,
      reviewer: reviewSelectValue
    };

    try {
      const res = modalType
        ? await updateTask({
          variables: {input, id: parseInt(task.id)}
        })
        : await createTask({
          variables: {input}
        })

      if (!res.errors) {
        submit();
        const messageType = modalType ? 'updated' : 'created';
        message.success(`Task is ${messageType} successfully!`);
        closeModal(!modal);
      } else {
        message.error(res.errors[0].message);
      }
    } catch (e) {
      message.error(e.message);
    }
  }

  const addNewRepository = async () => {
    if (!repositoryUrl || !accessToken) {
      message.error('Please type repository url and access token');
      return;
    }

    const input = {
      repository: repositoryUrl,
      accessToken,
      productSlug
    };

    try {
      const res = await createCodeRepository({
        variables: {input}
      });

      if (
        res.data &&
        res.data.createCodeRepository &&
        res.data.createCodeRepository.repository
      ) {
        addRepository(res.data.createCodeRepository.repository);
        message.success('Repository is created successfully!');
        setRepository(res.data.createCodeRepository.repository.id);
        toggleRepository(!editRepository);
      }
    } catch (e) {
      message.error(`Repository creation is failed! Reason: ${e.message}`);
    }
  }

  const updateInitiatives = async () => {
    const {data: newData} = await fetchInitiatives({
      productSlug: productSlug
    });

    setInitiatives(newData.initiatives);
  }

  const reviewSelectChange = (val: any) => {
    setReviewSelectValue(val);
  }

  return (
    <>
      <Modal
        title={`${modalType ? "Edit" : "Add"} Task`}
        visible={modal}
        onOk={handleOk}
        onCancel={handleCancel}
        className="add-modal add-task-modal"
        width={RICH_TEXT_EDITOR_WIDTH}
        maskClosable={false}
      >
        <Row className='mb-15'>
          <label>Title*:</label>
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Row>
        <Row className='mb-15'>
          <label>Short Description*:</label>
          <TextArea
            placeholder="Short Description"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            required
          />
        </Row>
        <Row
          className="rich-editor mb-15"
        >
          <label>Description*:</label>
          <RichTextEditor
            initialValue={modalType ? task.description : ''}
            setValue={onDescriptionChange}
          />
        </Row>
        {modalType && (
          <Row className='mb-15'>
            <label>Task detail url:</label>
            <Input
              placeholder="Task detail url"
              value={detailUrl}
              onChange={(e) => setDetailUrl(e.target.value)}
              required
            />
          </Row>
        )}
        {
          allCapabilities.length > 0 && (
            <Row className='mb-15'>
              <label>Capability:</label>
              <Select
                placeholder='Select a capability'
                onChange={setCapability}
                filterOption={filterOption}
                defaultValue={capability ? capability : null}
              >
                {allCapabilities.map((option: any, idx: number) => (
                  <Option key={`cap${idx}`} value={option.id}>
                    {option.name}
                  </Option>
                ))}
              </Select>
            </Row>
          )
        }
        {initiatives && (
          <>
            <Row justify="space-between" className='mb-5'>
              <Col>
                <label>Initiative:</label>
              </Col>
              <Col>
                {!editInitiative ? (
                  <PlusOutlined
                    className="my-auto mb-10"
                    onClick={() => toggleInitiative(!editInitiative)}
                  />
                ) : (
                  <MinusOutlined
                    className="my-auto mb-10"
                    onClick={() => toggleInitiative(!editInitiative)}
                  />
                )}
              </Col>
              {editInitiative && (
                <AddInitiative
                  modal={editInitiative}
                  productSlug={String(productSlug)}
                  modalType={false}
                  closeModal={toggleInitiative}
                  submit={updateInitiatives}
                />
              )}
            </Row>
            <Row className='mb-15'>
              <Select
                onChange={setInitiative}
                placeholder="Select initiative"
                filterOption={filterOption}
                showSearch
                defaultValue={initiative ? initiative : null}
              >
                {initiatives.map((option: any, idx: number) => (
                  <Option key={`init${idx}`} value={option.id}>
                    {option.name}
                  </Option>
                ))}
              </Select>
            </Row>
          </>
        )}
        {repositories && (
          <>
            <Row justify="space-between" className='mb-5'>
              <Col>
                <label>Repository:</label>
              </Col>
              <Col>
                {!editRepository ? (
                  <PlusOutlined
                    className="my-auto mb-10"
                    onClick={() => toggleRepository(!editRepository)}
                  />
                ) : (
                  <MinusOutlined
                    className="my-auto mb-10"
                    onClick={() => toggleRepository(!editRepository)}
                  />
                )}
              </Col>
            </Row>
            {editRepository && (
              <Row
                className='mb-15 p-15'
                style={{
                  background: "var(--bg-grey)"
                }}
              >
                <label>Repository url:</label>
                <Input
                  className='mb-15'
                  placeholder="https://github.com/<git_username>/<repo_name>"
                  value={repositoryUrl}
                  onChange={(e) => setRepositoryUrl(e.target.value)}
                />
                <label>Git access token: </label>
                <Input
                  placeholder="Access token"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  defaultValue={accessToken}
                />
                <Button
                  className="text-right mt-15"
                  onClick={() => addNewRepository()}
                >
                  Add Repository
                </Button>
              </Row>
            )}
            <Row
              justify="space-between"
              className='mb-15'
            >
              <Select
                onChange={setRepository}
                placeholder="Select repository"
              >
                {repositories.map((option: any, idx: number) => (
                  <Option key={`init${idx}`} value={option.id}>
                    {option.repository}
                  </Option>
                ))}
              </Select>
            </Row>
          </>
        )}
        <Row className='mb-15'>
          <label>Status: </label>
          <Select
            defaultValue={status}
            onChange={setStatus}
            placeholder="Select status"
          >
            {TASK_TYPES.map((option: string, idx: number) => (
              <Option key={`status${idx}`} value={idx}>{option}</Option>
            ))}
          </Select>
        </Row>
        <Row className='mb-15'>
          <label>Tags:</label>
          <Select
            mode="multiple"
            onChange={setTags}
            filterOption={filterOption}
            placeholder="Select tags"
            defaultValue={tags}
          >
            {allTags && allTags.map((option: any, idx: number) => (
              <Option key={`cap${idx}`} value={option.id}>
                {option.name}
              </Option>
            ))}
          </Select>
        </Row>
        <Row className='mb-15'>
          <label>Stacks:</label>
          <Select
            mode="multiple"
            onChange={setStacks}
            defaultValue={stacks}
            filterOption={filterOption}
            placeholder="Select stacks"
          >
            {allStacks && allStacks.map((option: any, idx: number) => (
              <Option key={`cap${idx}`} value={option.id}>
                {option.name}
              </Option>
            ))}
          </Select>
        </Row>
        <Row>
          <label>Depend on tasks:</label>
          <Select
            mode="multiple"
            onChange={setDependOn}
            filterOption={filterOption}
            placeholder="Select depend on tasks"
            defaultValue={dependOn}
          >
            {tasks &&
            tasks.map((option: any, idx: number) => (
              <Option key={`cap${idx}`} value={option.id}>
                {option.title}
              </Option>
            ))}
          </Select>
        </Row>
        <Row style={{marginTop: 20}}>
          <label>Reviewer*:</label>

          <Select
            onChange={val => reviewSelectChange(val)}
            placeholder="Select a reviewer"
            showSearch
            filterOption={filterOption}
            defaultValue={reviewSelectValue ? reviewSelectValue : null}
          >
            {
              allUsers.map((user: IUser) => (
                <Option key={`user-${user.slug}`} value={user.slug}>{user.fullName}</Option>
              ))
            }
          </Select>
        </Row>
      </Modal>
    </>
  );
}

const mapStateToProps = (state: any) => ({
  user: state.user,
  currentProduct: state.work.currentProduct,
  repositories: state.work.repositories,
  userRole: state.work.userRole,
  allTags: state.work.allTags,
});

// const mapDispatchToProps = (dispatch: any) => ({
//   addRepository: (data: WorkState) => dispatch(addRepository(data)),
// });
const mapDispatchToProps = () => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AddTask);